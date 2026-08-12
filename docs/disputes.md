# Disputes

AFTERIMAGE assumes memory will conflict. The dispute system makes conflict **visible and auditable** instead of deleting the losing narrative.

## Philosophy

When two claims disagree, the product shows:

# CONTESTED MEMORY

Example:

```text
CLAIM A                         CLAIM B
Building demolished             Building demolished
September 2029                  October 2029
Evidence × 4                    Evidence × 7
Witnesses × 3                   Witnesses × 5
```

**Never silently delete disputed claims.** Resolution may mark a preferred outcome; it must not erase the record of the conflict.

## Lifecycle

States (`DisputeState`):

| State | Meaning |
|-------|---------|
| `OPEN` | Challenge filed |
| `CONTESTED` | Active disagreement / counter-evidence |
| `RESOLVED` | Explicit resolution recorded |
| `WITHDRAWN` | Claimant withdrew; history retained |

Contract surface (`DisputeRegistry.sol`):

- `createDispute(...)`
- `submitEvidence(...)`
- `withdrawDispute(...)`
- `resolveDispute(...)`

Off-chain, Prisma models `Dispute` and `DisputeEvidence` mirror the audit trail for UI and RAG (with visibility controls).

## Creation

Disputes are signed (EIP-712 `Dispute` type) over:

- `afterimageId`
- `eventId`
- `reasonHash`
- `claimant`
- `nonce` / `deadline`

Reason text and supporting files live off-chain; the chain stores hashes and state transitions.

## Afterimage status

Opening a meaningful dispute typically moves the subject toward `CONTESTED`. The Field and detail pages must surface contested status visually (fragmented / dual-claim layouts), not hide it behind a single “canonical” card.

## AI & disputes

The Memory Engine must:

- surface conflicting claims when asked
- cite evidence on each side
- refuse to invent a winner without recorded resolution
- answer with `INSUFFICIENT EVIDENCE` rather than speculative arbitration

## Auditability

Every important transition should leave:

- actor
- timestamp
- reason / evidence hashes
- optional confirmed `transactionHash` (real only)
- prior and next state

Admin tools may resolve disputes; they may not purge history to make the archive look tidy.

## Anti-patterns

- Soft-deleting the minority claim
- Auto-resolving by witness count alone
- Showing only the “winning” timeline in Time Machine without a contested marker
- Fabricating resolution transactions

Disputes are first-class archival material. Contested memory is still memory.
