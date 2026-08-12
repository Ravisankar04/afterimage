# Smart contracts

AFTERIMAGE on-chain surface is a suite of Foundry registries. The chain stores **commitments** (hashes, ownership, attestations, dispute transitions) — not media.

> The blockchain is an immutable chronological commitment layer. It is **not** objective truth.

## Stack

- Solidity `0.8.24`
- Foundry (`forge`, `cast`, `anvil`)
- OpenZeppelin Contracts v5 (AccessControl, Pausable, ReentrancyGuard, EIP-712)

Package path: `packages/contracts`.

## Registries

| Contract | Responsibility |
|----------|----------------|
| `AfterimageRegistry.sol` | Afterimage identity, lifecycle status, owner, metadata hash, current event pointer |
| `EventRegistry.sol` | Temporal events, parent linkage, content/metadata/location hashes |
| `EvidenceRegistry.sol` | Evidence registration (content hash + storage reference hash) |
| `WitnessRegistry.sol` | Independent corroborations of events |
| `DisputeRegistry.sol` | Contested claims; open / contest / resolve / withdraw |
| `OwnershipRegistry.sol` | Ownership transfers tied to afterimage identity |
| `EIP712Verifier.sol` | Shared typed-data verification helpers |

### Afterimage lifecycle (`Status`)

`ACTIVE` → `CHANGING` → `LAST_SEEN` → `GONE` / `ARCHIVED` / `CONTESTED`

Invalid transitions revert. Terminal or contested states must not be silently rewritten into “clean” history without an auditable event.

### Event model

Each event commits:

- `afterimageId`
- `parentEventId` (history graph)
- `eventType`
- `contentHash`
- `metadataHash`
- `locationCommitment`
- timestamp / creator

Event types include creation, observation, photography, modification, damage, last-seen, destroyed, archived, ownership change, and custom — classification metadata, not truth labels.

### Evidence

On-chain evidence records bind:

- subject (`afterimageId` / `eventId`)
- `contentHash` (SHA-256 of bytes)
- `metadataHash`
- `storageReference` (hash of off-chain URI/key — not the file itself)

### Witnesses

Witness confirmations attest that an address signed over a specific `eventId` + `contentHash`. Duplicate witnesses for the same event should revert. Display as **corroboration**, never as proof of objective reality.

### Disputes

`DisputeRegistry` supports:

- `createDispute`
- `submitEvidence` (dispute-side evidence commitments)
- `withdrawDispute`
- `resolveDispute`

States: `OPEN`, `CONTESTED`, `RESOLVED`, `WITHDRAWN`.

**Claims are never deleted by dispute resolution.** Resolution is a state transition; underlying claims and evidence remain for audit.

### Ownership

Transfers emit auditable events and update the afterimage owner. Only owners (and roles where specified) may update privileged metadata or archive.

## Access control & safety patterns

- `ADMIN_ROLE` / `OPERATOR_ROLE` via OpenZeppelin `AccessControl`
- `pause` / `unpause` for emergency stop
- `ReentrancyGuard` on state-changing external entrypoints
- Explicit custom errors (`AfterimageNotFound`, `NotAfterimageOwner`, invalid transitions, etc.)
- Zero-address and empty-hash guards

Contracts should reject:

- unauthorized callers
- duplicate IDs / duplicate witnesses
- invalid parents / self-parent events
- expired or replayed EIP-712 signatures
- wrong signer / wrong domain (`chainId` + verifying contract)

## EIP-712

Typed signatures (see `@afterimage/crypto` and [cryptography.md](cryptography.md)) cover:

- event creation
- witness confirmation
- dispute submission
- ownership transfer

Domain: name `AFTERIMAGE`, version `1`, plus `chainId` and `verifyingContract`.

## Deployment

```bash
# Terminal A
anvil

# Terminal B
cd packages/contracts
forge install   # OpenZeppelin + forge-std (first run)
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
# or: pnpm deploy:local
```

`Deploy.s.sol` deploys the full suite and logs addresses. Copy them into root `.env`:

```text
AFTERIMAGE_REGISTRY_ADDRESS=
EVENT_REGISTRY_ADDRESS=
EVIDENCE_REGISTRY_ADDRESS=
WITNESS_REGISTRY_ADDRESS=
DISPUTE_REGISTRY_ADDRESS=
OWNERSHIP_REGISTRY_ADDRESS=
```

Never invent addresses or transaction hashes for demos. If a deploy has not run, leave fields empty and hide explorer links.

## Testing

From `packages/contracts`:

```bash
forge test -vvv
forge test --fuzz-runs 1000
```

Covered scenarios (unit / fuzz / invariants as implemented in `test/`):

- unauthorized access
- duplicate events / witnesses
- invalid parent / self-parent
- signature replay, expiry, wrong signer
- ownership transfer
- dispute lifecycle
- pause behavior

CI runs Foundry tests and fails the pipeline on failure.

## What contracts deliberately omit

- No file bytes
- No “truth score”
- No automatic deletion of contested claims
- No oracle of physical reality

They preserve a signed chronological record that the rest of the stack can index, display, and argue over — honestly.
