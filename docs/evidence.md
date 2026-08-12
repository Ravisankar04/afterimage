# Evidence

Evidence is how AFTERIMAGE attaches **checkable artifacts** to temporal claims. Evidence does not equal truth; it equals “this byte sequence was committed under this hash by this actor at this time.”

## What counts as evidence

Typed artifacts, including:

- photographs / frames
- video / audio
- documents (PDF, text, JSON)
- sensor or attestation payloads
- other structured blobs

Each evidence record links to an **afterimage** and usually a specific **event**.

## On-chain vs off-chain

| Stored on-chain | Stored off-chain |
|-----------------|------------------|
| `contentHash` (SHA-256 of bytes) | File bytes |
| `metadataHash` | Human-readable titles/descriptions (also indexed in DB) |
| `storageReference` (commitment to URI/key) | Actual URI / object key in StorageProvider |
| submitter, timestamps, linkage IDs | Processing status, embeddings, previews |

**Never store large files on-chain.**

## Lifecycle

```text
upload
  → MIME/extension/magic-byte validation
  → store under random key
  → worker hashes raw bytes (SHA-256)
  → register Evidence (DB + optional chain)
  → index for search / RAG (public or allowed visibility only)
  → status: COMPLETE (or FAILED without inventing hashes)
```

Processing UI should reflect real job state. Do not mark evidence “verified on-chain” until a real transaction is confirmed.

## Integrity rules

1. Recompute `contentHash` from stored bytes; do not trust client-only hashes.
2. Do not bake filenames into the content hash.
3. Private evidence must not appear in public Field cards, public verify endpoints, or AI retrieval corpora.
4. Contested claims keep their evidence; disputes add evidence — they do not erase prior artifacts.

## Citations

The Memory Engine and forensic UI cite evidence IDs. A citation should open a panel with:

- evidence ID / type / title
- creator
- timestamp
- content hash
- storage reference (non-secret form)
- blockchain transaction **only if real**
- related witnesses

If any of those fields are unknown, show absence — never placeholders that look like mainnet proofs.

## Relationship to events

Evidence anchors a node in the history graph. Multiple evidence items may support one event; one artifact may be referenced in disputes. The UI should make the binding explicit: **event → evidence → hash → (optional) tx**.

## Failure modes

| Failure | Correct behavior |
|---------|------------------|
| Upload rejected | No evidence row pretending success |
| Hash job failed | `FAILED` status; no fake hash |
| Storage lost | Surface integrity error; do not invent replacement bytes |
| Visibility private | Omit from public surfaces |

Evidence is the archive’s spine. Treat it with forensic honesty.
