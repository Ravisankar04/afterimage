# Cryptography

AFTERIMAGE’s cryptographic model exists to make claims **checkable**, not to declare them true.

## Package

`packages/crypto` (`@afterimage/crypto`) provides:

- SHA-256 content hashing
- Canonical JSON metadata hashing
- EIP-712 typed-data builders
- Nonce helpers
- Signature verification utilities (viem)

API, worker, and clients must share these constructions so off-chain signatures match on-chain verifiers.

## Content hashing

```text
raw file bytes
  → SHA-256
  → contentHash (bytes32 / 0x-hex)
```

Rules:

- Hash **only** payload bytes
- Do **not** include filename, path, MIME, or mtime in the content hash
- Never “fake” a hash for UI polish — compute from actual bytes
- Identical bytes ⇒ identical `contentHash` (dedupe / verify)

Helpers: `hashContent`, `hashContentString` in `packages/crypto/src/hash.ts`.

## Canonical metadata hashing

Structured metadata (titles, descriptions, typed fields) is serialized with a **canonical JSON** form before hashing so key order and whitespace cannot produce conflicting hashes for the same logical object.

The resulting `metadataHash` is what registries store alongside `contentHash`.

## EIP-712 typed signatures

Domain:

| Field | Value |
|-------|--------|
| `name` | `AFTERIMAGE` |
| `version` | `1` |
| `chainId` | deployment chain |
| `verifyingContract` | target registry address |

Primary types (see `packages/crypto/src/eip712.ts`):

1. **EventCreation** — `afterimageId`, `parentEventId`, `eventType`, `contentHash`, `metadataHash`, `locationCommitment`, `timestamp`, `nonce`, `deadline`
2. **WitnessConfirmation** — `eventId`, `contentHash`, `witness`, `nonce`, `deadline`
3. **Dispute** — `afterimageId`, `eventId`, `reasonHash`, `claimant`, `nonce`, `deadline`
4. **OwnershipTransfer** — `afterimageId`, `from`, `to`, `metadataHash`, `nonce`, `deadline`

Replay protection:

- Domain separation (`chainId` + `verifyingContract`)
- Per-signer / per-action **nonce**
- **deadline** freshness

Verification must reject wrong signer, expired deadline, reused nonce, and mismatched hashes.

## Location commitments

Location visibility:

| Mode | Public exposure |
|------|-----------------|
| `PUBLIC` | Exact coordinates (creator choice) |
| `APPROXIMATE` | Coarse grid (~0.1°) label only |
| `PRIVATE` | Commitment only — no lat/lng |

Private commitment (API helper):

```text
preimage = lat(8 decimals) | lng(8 decimals) | salt
commitment = keccak256(utf8(preimage))
```

Public APIs return the commitment for `PRIVATE` records and **never** the salt/preimage. Precise coordinates must not leak via search snippets, AI citations, or map tiles unless visibility is `PUBLIC`.

## Verification UX

Public verification pages should show:

- content hash
- metadata hash
- signer address
- (when real) transaction hash, block number, contract address

If chain data is missing or unconfirmed, say so. **Never hardcode fake transaction information.**

## Anti-patterns

- Hashing a renamed file and treating it as “new evidence” without acknowledging identical bytes
- Client-supplied hashes without server recomputation from stored bytes
- Presenting signature presence as “verified historical fact”
- Shipping demo wallets / txs that were never signed or mined

Cryptography here is forensic plumbing: it binds statements to keys and bytes across time.
