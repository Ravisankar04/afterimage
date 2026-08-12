import { randomBytes } from "node:crypto";
import type { Readable } from "node:stream";

export type PutObjectInput = {
  /** Opaque random key — never user-controlled path segments */
  key: string;
  body: Buffer | Readable | Uint8Array;
  contentType: string;
  contentLength?: number;
  metadata?: Record<string, string>;
};

export type PutObjectResult = {
  key: string;
  /** Provider URI without credentials (s3://bucket/key, ipfs://cid, file://key) */
  uri: string;
  byteSize: number;
  etag?: string;
  cid?: string;
};

export type GetObjectResult = {
  body: Buffer;
  contentType: string;
  byteSize: number;
};

/**
 * StorageProvider — never expose credentials in return values or URIs shown to clients.
 */
export interface StorageProvider {
  readonly kind: "local" | "s3" | "ipfs";
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObject(key: string): Promise<GetObjectResult>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Signed / temporary URL if supported; otherwise null (use API proxy). */
  getSignedUrl?(key: string, expiresInSeconds?: number): Promise<string | null>;
}

/** Cryptographically random storage key (never derived from filename). */
export function generateStorageKey(ext?: string): string {
  const id = randomBytes(24).toString("hex");
  const safeExt = ext && /^\.[a-z0-9]{1,8}$/i.test(ext) ? ext.toLowerCase() : "";
  const prefix = id.slice(0, 2);
  return `${prefix}/${id}${safeExt}`;
}
