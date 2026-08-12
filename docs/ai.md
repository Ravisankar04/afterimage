# AI — Memory Engine

AFTERIMAGE’s AI is an **evidence-backed archival assistant**, not a storyteller with creative license.

## Purpose

Users ask questions such as:

- What happened here?
- When did this disappear?
- Who documented it first?
- What changed?
- Who witnessed the final observation?
- Were there conflicting claims?
- Tell me the complete history.

Answers must be grounded in retrieved AFTERIMAGE records.

## Architecture

```text
query
  → retrieve evidence + events (Postgres, optional pgvector similarity)
  → filter by visibility (no private leakage)
  → generate answer only from retrieved chunks
  → attach citations (evidence IDs)
  → if insufficient → INSUFFICIENT EVIDENCE
```

Implementation: `apps/api/src/ai/memory-engine.ts` (`AIMemoryEngine`).

Stack notes:

- PostgreSQL for structured retrieval
- pgvector for embedding similarity when configured
- Model credentials via `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` / `AI_EMBEDDING_MODEL` on the **server only**

## Citation contract

Every factual statement should reference evidence:

```text
The building was first documented in August 2026. [EVIDENCE #…]
```

Citation payloads include evidence id, type, title, content hash, timestamp, and a short excerpt. Clicking opens forensic detail — including real chain tx only when present.

Story mode segments (`year`, `text`, `evidenceIds`) must keep the same binding.

## Hard refusals

The AI must **never**:

- fabricate evidence
- fabricate timestamps
- fabricate witnesses
- fabricate blockchain transactions
- infer facts without evidence
- present speculation as history
- resolve disputes by imagination

## Insufficient evidence

When retrieval cannot support an answer, return the explicit protocol message (conceptually):

```text
INSUFFICIENT EVIDENCE: Available AFTERIMAGE records do not support a factual
answer to this question. No claim was fabricated.
```

Do not pad with plausible narrative.

## Contested memory

If claims conflict, say so. Present both sides with citations and witness/evidence counts. Do not collapse to a single “true” timeline unless an on-record resolution exists — and even then, keep the dispute visible in forensic views.

## Privacy

Retrieval corpora exclude private evidence and precise private coordinates. Approximate/public material only, unless the requesting principal is authorized.

## Modes

| Mode | Behavior |
|------|----------|
| Q&A | Direct answers + citations |
| Story | Chronological segments, each evidence-backed |
| Forensic | Emphasize hashes, signers, witnesses, disputes, gaps |

## Anti-patterns

- “Helpful” hallucination when the archive is empty
- Inventing demo transaction hashes in answers
- Training the model to sound certain without citations
- Letting the client supply “context” that bypasses retrieval filters

If the archive cannot support a sentence, the Memory Engine stays silent rather than inventing an afterimage.
