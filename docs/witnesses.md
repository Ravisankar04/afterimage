# Witnesses

Witnesses provide **independent corroboration** of an afterimage event. They strengthen the archival record; they do **not** mint objective truth.

## Language

Use:

- **CORROBORATION**
- **N INDEPENDENT WITNESSES**

Do **not** use:

- “Verified true”
- “Objective confirmation”
- **TRUTH SCORE**

Even with many witnesses, AFTERIMAGE only claims: *these addresses signed that they corroborate this event/hash.*

## Flow

```text
Event committed (contentHash + eventId)
  → witness reviews claim / evidence
  → signs EIP-712 WitnessConfirmation
  → WitnessRegistry + DB confirmation row
  → UI increments witness count / reputation stats
```

Typed fields include `eventId`, `contentHash`, `witness`, `nonce`, `deadline` (see [cryptography.md](cryptography.md)).

## Rules

- Duplicate witness confirmations for the same event by the same address should fail.
- Self-corroboration policy should be explicit in product UX (prefer independent addresses).
- Withdrawn confirmations remain auditable; they affect reputation accounting, not silent erasure.
- Disputed confirmations reduce confidence signals but do not delete the original event.

## Witness reputation

Track aggregates such as:

- confirmed events
- disputed confirmations
- successful corroborations
- withdrawn confirmations

Present as **WITNESS REPUTATION** — a reliability / consistency signal for archival reading.

Reputation must **not**:

- decide whether an event is objectively true
- auto-hide contested memory
- be labeled a truth score

## UI patterns

On event and forensic views:

```text
WITNESSES
0x83…   confirmed  ·  2026-08-12
0x92…   confirmed  ·  2026-08-13
0x11…   withdrawn  ·  2026-08-20
```

On contested subjects, show witness counts **per claim**, side by side.

## Security notes

- Verify EIP-712 signatures server-side and on-chain.
- Reject expired / replayed attestations.
- Never fabricate witness addresses for demos; seed data must use consistent local Anvil accounts if needed, clearly marked as local.

Witnesses are how the archive accumulates social and cryptographic weight — always framed as corroboration.
