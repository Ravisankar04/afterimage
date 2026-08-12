# AFTERIMAGE

### Preserve What Time Removes.

AFTERIMAGE is a blockchain-backed **temporal provenance protocol** for preserving cryptographically verifiable histories of temporary, disappearing, changing, or destroyed real-world things — demolished buildings, murals, pop-ups, festivals, installations, seasonal markets, scientific observations, and more.

The fundamental question:

> **Can we prove something existed after it is gone?**

AFTERIMAGE does **not** claim that blockchain determines objective truth.

It records:

- who made a claim
- when they made it
- what evidence they attached
- what they cryptographically signed
- who independently corroborated it
- what changed over time
- what conflicting claims exist
- what the chain permanently committed

The product should feel like an **experimental digital museum + forensic archive + archaeological excavation of reality** — not an NFT marketplace, trading UI, or generic blockchain dashboard.

---

## Critical rules

These are non-negotiable product and engineering constraints:

| Rule | Meaning |
|------|---------|
| No fake chain data | Never invent transaction hashes, wallet addresses, or “verified” status |
| Blockchain ≠ truth | The chain is an immutable chronological commitment layer, not objective reality |
| Files stay off-chain | Photographs, video, and documents are hashed; only hashes and commitments go on-chain |
| AI never fabricates | Evidence-backed RAG only; otherwise return `INSUFFICIENT EVIDENCE` |
| Claims never silently deleted | Disputes mark memory as contested; both sides remain auditable |
| Location privacy | Precise coordinates are never exposed unless visibility is explicitly `PUBLIC` |
| Auth is server-side | Never rely solely on frontend authorization |
| MIME distrust | Never trust client-provided MIME types; validate magic bytes |

See [docs/security.md](docs/security.md) for the full threat model.

---

## Architecture overview

Monorepo (`pnpm` + Turborepo):

```text
apps/
  api/       Fastify + Prisma + storage + RAG + indexer hooks
  worker/    BullMQ workers (hashing, processing, chain jobs, AI)
  web/       Next.js archive experience (Field, Create, Time Machine)

packages/
  contracts/ Foundry Solidity registries
  crypto/    SHA-256, canonical JSON, EIP-712, verification
  shared/    Shared domain & API types
```

| Layer | Role |
|-------|------|
| **Blockchain** | Authoritative for registered claims, content/metadata hashes, ownership, attestations, dispute transitions |
| **PostgreSQL (+ pgvector)** | Search, indexing, analytics, AI retrieval, UI performance — must not contradict chain state |
| **Object storage** | Actual files (local / S3 / IPFS) |
| **Redis + BullMQ** | Async processing and confirmation-aware chain jobs |

Deeper detail: [docs/architecture.md](docs/architecture.md).

---

## Blockchain role

The chain provides an **immutable chronological commitment**:

```text
claim → hash → signature → on-chain record → corroboration / dispute
```

It does **not**:

- decide whose memory is “correct”
- store media bytes
- replace forensic investigation
- erase contested narratives

When claims conflict, the UI shows **CONTESTED MEMORY** — both claims remain visible with their evidence and witness counts.

---

## Why files are not on-chain

Large media is expensive, mutable in practice for UX, and privacy-sensitive.

AFTERIMAGE stores:

```text
raw file bytes → SHA-256 → contentHash (on-chain / indexed)
metadata JSON → canonical hash → metadataHash
file bytes    → StorageProvider (off-chain URI / key)
```

On-chain: hashes, commitments, ownership, attestations.  
Off-chain: photographs, video, documents.  
Never store large files directly on-chain.

---

## Cryptographic model

Implemented in `@afterimage/crypto`:

1. **Content hash** — SHA-256 over raw bytes only (no filename, path, or mtime)
2. **Canonical JSON** — deterministic metadata hashing
3. **EIP-712** — typed signatures for event creation, witness confirmation, dispute submission, ownership transfer (includes `chainId`, verifying contract, `nonce`, `deadline`)
4. **Location commitments** — for `PRIVATE` visibility: `keccak256(lat|lng|salt)`; public APIs never leak the preimage

Details: [docs/cryptography.md](docs/cryptography.md).

---

## Witness system

Witnesses **corroborate**; they do not mint truth.

Display language:

- **CORROBORATION** / **N INDEPENDENT WITNESSES**
- Never “objective truth” or “TRUTH SCORE”

Reputation tracks confirmation history (including disputed / withdrawn confirmations) as **WITNESS REPUTATION** — a reliability signal, not a verdict.

Details: [docs/witnesses.md](docs/witnesses.md).

---

## Dispute system

Anyone can challenge a claim. Disputed records become **CONTESTED MEMORY**.

States: `OPEN` → `CONTESTED` → `RESOLVED` | `WITHDRAWN`.

**Claims are never silently deleted.** Both sides stay in the archive with evidence and witnesses.

Details: [docs/disputes.md](docs/disputes.md).

---

## AI architecture

The **Memory Engine** answers questions only from retrieved AFTERIMAGE evidence (PostgreSQL + pgvector RAG).

Every factual statement must cite evidence. If retrieval is insufficient:

```text
INSUFFICIENT EVIDENCE: Available AFTERIMAGE records do not support a factual answer
to this question. No claim was fabricated.
```

The AI must never fabricate evidence, timestamps, witnesses, or transaction hashes.

Details: [docs/ai.md](docs/ai.md).

---

## Documentation map

| Doc | Topic |
|-----|--------|
| [docs/architecture.md](docs/architecture.md) | System layout & data authority |
| [docs/contracts.md](docs/contracts.md) | Solidity registries |
| [docs/cryptography.md](docs/cryptography.md) | Hashing & EIP-712 |
| [docs/evidence.md](docs/evidence.md) | Evidence model |
| [docs/witnesses.md](docs/witnesses.md) | Corroboration |
| [docs/disputes.md](docs/disputes.md) | Contested memory |
| [docs/storage.md](docs/storage.md) | Off-chain storage |
| [docs/indexing.md](docs/indexing.md) | Chain indexer |
| [docs/ai.md](docs/ai.md) | Evidence-backed RAG |
| [docs/motion.md](docs/motion.md) | Motion / scroll system |
| [docs/security.md](docs/security.md) | Threat model & critical rules |

---

## Prerequisites

- Node.js ≥ 20
- [pnpm](https://pnpm.io) 9.x (`packageManager` pinned in root `package.json`)
- Docker (Postgres + Redis)
- [Foundry](https://book.getfoundry.sh/) (`forge`, `cast`, `anvil`) for contracts

---

## Setup

```bash
# 1. Install workspace dependencies
pnpm install

# 2. Environment
cp .env.example .env
# Edit SESSION_SECRET and any storage/AI keys as needed.

# 3. Infrastructure (Postgres + Redis)
pnpm infra

# 4. Local chain
anvil
# (separate terminal)

# 5. Deploy registries to Anvil
cd packages/contracts
forge install   # first time: OpenZeppelin + forge-std
pnpm deploy:local
# Copy printed addresses into root .env (AFTERIMAGE_REGISTRY_ADDRESS, etc.)

# 6. Database
pnpm db:push
pnpm db:seed

# 7. Run API + worker + web
pnpm dev
```

Defaults:

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| Anvil | http://127.0.0.1:8545 |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

Full Docker Compose (api/worker/web + infra) is defined in `docker-compose.yml`.

---

## Testing

```bash
# All workspace tests (Turbo)
pnpm test

# Typecheck / lint
pnpm typecheck
pnpm lint

# Foundry (from packages/contracts)
pnpm --filter @afterimage/contracts test

# API unit/smoke tests
pnpm --filter @afterimage/api test

# Frontend smoke tests
pnpm --filter @afterimage/web test
```

CI runs install → lint → typecheck → frontend tests → backend tests → Foundry tests → build, and **fails the job on any test failure**. See [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## Deployment

1. Provision Postgres (with `pgvector`), Redis, and object storage (S3 or IPFS).
2. Deploy contracts with Foundry to the target chain; set registry addresses and `CHAIN_ID` / `RPC_URL`.
3. Set production secrets (`SESSION_SECRET`, storage credentials, `DEPLOYER_PRIVATE_KEY` only on secure deploy hosts — **never** in the browser).
4. Run `pnpm db:migrate` (or `db:push` for early environments), then start `api`, `worker`, and `web`.
5. Configure `CONFIRMATIONS_REQUIRED` for indexer finality; set `BLOCK_EXPLORER_URL` only when a real explorer exists.
6. Do not ship placeholder transaction hashes or demo “verified” badges backed by invented data.

---

## Security (summary)

- Access control on contracts (roles, pause), API, and storage
- EIP-712 domain separation against cross-chain / cross-contract replay
- Upload hardening: size limits, extension allowlists, magic-byte MIME checks, random storage keys
- Private evidence and private coordinates never returned on public routes
- Private keys and storage credentials never exposed to the client

Full write-up: [docs/security.md](docs/security.md).

---

## Limitations

AFTERIMAGE intentionally does **not**:

- Prove that an event happened in the physical world with certainty
- Replace courts, journalists, or forensic labs
- Guarantee that off-chain storage remains available forever (pinning / backups are operational concerns)
- Treat witness count as truth
- Resolve contested memory into a single canonical narrative without an explicit dispute resolution path
- Put media on-chain for “permanence theater”

What it **does** provide is a durable, auditable structure of claims, hashes, signatures, corroboration, and disputes — so that when something disappears, its **afterimage** can still be examined.

---

## License

MIT
