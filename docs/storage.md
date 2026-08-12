# Storage

AFTERIMAGE separates **bytes** from **commitments**. Storage holds files; the chain and database hold hashes and references.

## Principles

1. Never store large files on-chain.
2. Never expose private storage credentials to clients or logs.
3. Use random storage keys (no user-controlled paths).
4. Public URLs must not leak private evidence.
5. Losing storage does not authorize inventing replacement content hashes.

## Provider interface

`StorageProvider` in `apps/api` with implementations:

| Provider | Use |
|----------|-----|
| `LocalStorageProvider` | Local/dev (`STORAGE_LOCAL_PATH`) |
| `S3StorageProvider` | Production object storage |
| `IPFSStorageProvider` | Content-addressed publishing (`ipfs://CID`) |

Select via `STORAGE_PROVIDER=local|s3|ipfs` in `.env`.

## Object model

`StorageObject` rows track:

- provider kind
- object key / CID
- content hash (once computed)
- size, detected MIME
- visibility / linkage to evidence
- created/updated timestamps

The on-chain `storageReference` commits to a stable reference identifier (hashed), not to AWS keys or API tokens.

## Upload path

```text
client multipart upload
  → API validates size, extension allowlist, magic bytes
  → provider.putObject(randomKey, bytes)
  → enqueue processing (hash, preview, embed text)
  → evidence row updated with contentHash + storage metadata
```

### Security controls

- Max size: `MAX_UPLOAD_SIZE`
- Extension allowlist: `ALLOWED_UPLOAD_EXTENSIONS`
- MIME from magic bytes — **never trust browser Content-Type alone**
- Reject path traversal and executable types
- Strip / ignore malicious filenames; store under opaque keys

See [security.md](security.md) for the broader upload threat model.

## Visibility

| Visibility | Storage / API behavior |
|------------|------------------------|
| `PUBLIC` | May be served via public base URL / gateway |
| `APPROXIMATE` | Media may be public; precise geo withheld |
| `PRIVATE` | Authenticated / authorized fetch only |

AI retrieval and public Field views must respect the same visibility gates.

## IPFS notes

- Prefer returning `ipfs://CID` (or gateway URL derived from config) without embedding API credentials.
- Pinning and long-term availability are operational concerns — document them; do not pretend chain storage solved permanence.

## S3 notes

- Credentials only on API/worker hosts.
- Prefer pre-signed URLs with short TTL for private objects.
- `STORAGE_PUBLIC_BASE_URL` only for intentionally public buckets.

## Integrity

Verification flow:

```text
download bytes → SHA-256 → compare to registered contentHash
```

Mismatch ⇒ integrity failure. Do not “repair” by rewriting the historical hash.

## Anti-patterns

- Putting JPEGs in calldata “for permanence”
- Using original filenames as object keys
- Shipping `.env` storage secrets to Next.js `NEXT_PUBLIC_*`
- Serving private objects from an open bucket

Storage is the body of the archive; cryptography is the seal.
