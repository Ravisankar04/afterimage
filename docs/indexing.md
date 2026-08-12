# Indexing

The blockchain indexer bridges **authoritative chain logs** and **queryable Postgres state**. It must be confirmation-aware, idempotent, and honest about finality.

## Role

Listen for registry events and persist `BlockchainEvent` (and related domain updates) so the Field, verify pages, and AI can join archival records to real chain coordinates.

## Events of interest

- `AfterimageCreated`
- `EventCreated`
- `EvidenceRegistered`
- `WitnessAdded`
- `DisputeCreated`
- `DisputeResolved`
- `OwnershipTransferred`
- `AfterimageMarkedGone` (and related status changes)

Exact event names follow the Solidity contracts in `packages/contracts/src`.

## Persisted fields

For each log:

| Field | Purpose |
|-------|---------|
| `blockNumber` | Ordering / finality |
| `blockHash` | Reorg detection |
| `transactionHash` | Public verify links |
| `logIndex` | Uniqueness with tx |
| `contractAddress` | Registry identity |
| `eventName` | Type discrimination |
| `timestamp` | Display / sorting |
| payload fields | IDs, hashes, actors |

**Never invent `transactionHash` values.** If a job has not confirmed on-chain, leave chain fields null and show processing / pending UI.

## Operational requirements

The indexer / chain workers must handle:

- **Retries** on transient RPC failure
- **Idempotency** — duplicate logs must not double-apply state
- **Confirmation depth** — `CONFIRMATIONS_REQUIRED` (default `3`) before treating a tx as settled for “verified” UX
- **Reorganization awareness** — if `blockHash` at a height changes, roll back or reorg-safe rewrite indexed rows from that point
- **Cursor persistence** — `IndexerState` (or equivalent) stores last processed block per chain/contract

## Authority rule

```text
confirmed chain state  ⊇  what UI may call “on-chain”
database convenience views  ⊆  must reconcile toward chain
```

If Postgres and chain diverge, repair toward the chain. Do not paper over divergence with fabricated receipts.

## UX coupling

| Chain status | UI language |
|--------------|-------------|
| Not submitted | Draft / local only |
| Submitted, unconfirmed | Pending confirmation |
| Confirmed ≥ depth | On-chain commitment (with real explorer link if configured) |
| Reorged / replaced | Trace updated / previous tx superseded — never hide quietly |

`BLOCK_EXPLORER_URL` empty ⇒ hide explorer links rather than linking to placeholders.

## Failure honesty

RPC outages, deploy-not-run, or missing registry addresses are expected in local setups. Surfaces should say the commitment layer is unavailable — not simulate mainnet proofs.

Indexing is how AFTERIMAGE stays fast without lying about the ledger.
