# Architecture

AFTERIMAGE is a temporal provenance stack: an immutable on-chain commitment layer, an off-chain evidence store, and a queryable index optimized for archival UX and evidence-backed AI.

## Design intent

The system answers: **what was claimed, by whom, when, with what evidence, and who corroborated or contested it?**

It does **not** answer: **what is objectively true?**

Blockchain is the chronological commitment layer. PostgreSQL is the search and retrieval layer. Object storage holds bytes. The UI is an archive, not a marketplace.

## Monorepo layout

```text
afterimage/
├── apps/
│   ├── api/          HTTP API, Prisma, storage adapters, RAG, indexer entrypoints
│   ├── worker/       BullMQ consumers (processing, hashing, chain, AI jobs)
│   └── web/          Next.js Field / Create / Time Machine experience
├── packages/
│   ├── contracts/    Foundry registries (Afterimage, Event, Evidence, Witness, Dispute, Ownership)
│   ├── crypto/       SHA-256, canonical JSON, EIP-712 builders, verify helpers
│   └── shared/       Shared enums and DTOs for chain + API clients
├── docs/             Protocol & product documentation
└── docker-compose.yml
```

Package manager: **pnpm** workspaces. Task runner: **Turborepo**.

## Authority boundaries

| Concern | Authority |
|---------|-----------|
| Registered claims, hashes, ownership, attestations, dispute state transitions | **Blockchain** |
| Search, embeddings, analytics, denormalized UI views, processing status | **PostgreSQL** |
| Media bytes | **StorageProvider** (local / S3 / IPFS) |
| Job orchestration | **Redis + BullMQ** |

**Rule:** database state must never contradict confirmed chain state. Indexers and workers reconcile toward the chain; they do not invent finality.

## Request flow (create → preserve)

```text
Creator (wallet)
  → web signs EIP-712 payload
  → api validates + stores metadata / queues upload
  → worker hashes bytes (SHA-256), writes StorageObject
  → chain tx registers hashes / event / evidence
  → indexer writes BlockchainEvent + confirmation depth
  → Field / detail / AI retrieve from Postgres (citations → evidence → hash → tx)
```

## Core domain objects

- **Afterimage** — identity of a real-world subject through time (status: `ACTIVE`, `CHANGING`, `LAST_SEEN`, `GONE`, `ARCHIVED`, `CONTESTED`)
- **AfterimageEvent** — temporal node in a history graph (`parentEventId`, event type, content/metadata hashes, location commitment)
- **Evidence** — off-chain artifact linked by `contentHash` + storage reference
- **Witness / WitnessConfirmation** — independent corroboration of an event
- **Dispute / DisputeEvidence** — contested memory; claims retained
- **OwnershipEvent** — transfers and collaborative control
- **BlockchainEvent** — indexed logs with block/tx identity (real hashes only)

## Apps

### `apps/api`

Fastify + TypeScript. Responsibilities:

- REST routes for afterimages, events, evidence, witnesses, disputes, uploads, verify, AI, public verification
- Prisma schema (PostgreSQL + pgvector notes)
- Storage provider factory
- Location privacy helpers
- Memory Engine (RAG)
- Queue producers + optional indexer hooks
- Audit logging

### `apps/worker`

BullMQ workers for file processing, hashing, storage finalization, embedding text, chain submission / confirmation waits, and notification-style jobs. Workers must treat chain receipts as authoritative and must not fabricate transaction hashes when a job fails.

### `apps/web`

Next.js App Router archive: kinetic homepage, Memory Field, create flow, forensic / story modes. Wallet connection is secondary to archival narrative. Motion respects `prefers-reduced-motion` (see [motion.md](motion.md)).

## Packages

### `@afterimage/contracts`

Solidity 0.8.24 registries with AccessControl, Pausable, ReentrancyGuard. Deployed via `script/Deploy.s.sol`. See [contracts.md](contracts.md).

### `@afterimage/crypto`

Shared hashing and EIP-712 typed data used by API, worker, and (via the same constructions) client signing. See [cryptography.md](cryptography.md).

### `@afterimage/shared`

Enums (`AfterimageStatus`, `EventType`, `EvidenceType`, `DisputeState`) and record shapes mirrored between chain and TS clients.

## Event pipeline

1. **Capture** — user uploads / describes observation  
2. **Hash** — SHA-256 of raw bytes  
3. **Sign** — EIP-712 over hashes + nonce + deadline  
4. **Witness** — optional independent confirmations  
5. **Record** — on-chain registry + DB index  
6. **Disappear** — physical subject may go; afterimage remains  

## History graph

Events form a directed graph via `parentEventId`. Validations reject self-parents and invalid lineage. Ghost Mode / Time Machine UIs walk this graph; they must not invent nodes.

## Environment layers

| Layer | Local | Production |
|-------|-------|------------|
| Chain | Anvil | Public EVM L2/L1 |
| DB | Docker Postgres (pgvector image) | Managed Postgres + vector |
| Cache/jobs | Docker Redis | Managed Redis |
| Storage | `local` filesystem | S3 or IPFS |
| Secrets | `.env` (gitignored) | Secret manager; never `NEXT_PUBLIC_*` for private keys |

## Related docs

- [contracts.md](contracts.md) — on-chain surface  
- [indexing.md](indexing.md) — confirmation depth & reorg awareness  
- [storage.md](storage.md) — bytes vs hashes  
- [ai.md](ai.md) — retrieval-only answers  
- [security.md](security.md) — trust boundaries  
