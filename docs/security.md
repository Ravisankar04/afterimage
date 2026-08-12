# Security

AFTERIMAGE treats security as part of archival integrity. A beautiful interface that lies about hashes or leaks private coordinates fails the product.

## Critical rules

1. Never create fake blockchain data.
2. Never create fake transaction hashes.
3. Never create fake wallet addresses.
4. Never claim an event is verified when it isn’t.
5. Never fabricate evidence.
6. Never allow AI to fabricate provenance.
7. Never store large files directly on-chain.
8. Never expose private evidence.
9. Never expose private coordinates.
10. Never trust client-provided MIME types.
11. Never rely exclusively on frontend authorization.
12. Never silently delete disputed claims.
13. Never describe blockchain as objective truth.

## Trust boundaries

| Boundary | Enforce |
|----------|---------|
| Browser → API | AuthZ on every mutating route; validate Zod schemas |
| API → Storage | Server credentials only; random keys |
| API → Chain | Server or user-signed EIP-712; verify signer |
| Worker → DB/Chain | Idempotent jobs; no invented receipts |
| AI → User | Citation-only; visibility filters |

## Smart contracts

- Role-based access (`ADMIN_ROLE`, `OPERATOR_ROLE`)
- Pausable emergency stop
- Reentrancy guards on state changes
- Signature replay protections (nonce, deadline, domain)
- Reject unauthorized, duplicate, and invalid-graph operations

See [contracts.md](contracts.md).

## Uploads

Protect against path traversal, malicious filenames, oversized files, MIME spoofing, executables, malformed payloads, SSRF via URL fetch features, and XSS via stored content.

Validate **extension + magic bytes + size**. Do not trust `Content-Type` from the client.

## Location privacy

`PUBLIC` / `APPROXIMATE` / `PRIVATE` with cryptographic commitments for private points. Public search, maps, and AI must not leak precise private coordinates.

## Secrets

- `.env` gitignored; ship `.env.example` without secrets
- `DEPLOYER_PRIVATE_KEY` and storage keys never in `NEXT_PUBLIC_*`
- `SESSION_SECRET` strong in production
- Rotate keys if leaked; treat Anvil keys as local-only

## Authorization roles

Conceptual roles: `OWNER`, `CREATOR`, `WITNESS`, `COLLABORATOR`, `VIEWER`.

Enforce on backend, contracts, and storage. Frontend hiding is not control.

## AI safety

See [ai.md](ai.md). Insufficient evidence ⇒ explicit refusal. No speculative provenance.

## Disputes & integrity

Contested claims remain. Resolution is additive state, not deletion. Audit logs for sensitive actions.

## Operational

- Rate limit public APIs
- Helmet / CORS configured for known web origin
- Confirmation depth before “on-chain” UX
- Dependency and Foundry test gates in CI

## Incident honesty

If data is lost, corrupted, or unconfirmed, say **THE TRACE WAS LOST** (or equivalent) — do not reconstruct fake chain proof to soothe the UI.

Security here is the difference between an archive and a fiction.
