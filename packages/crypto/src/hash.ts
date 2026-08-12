/**
 * SHA-256 content hashing from raw bytes only.
 * Does not include filenames, paths, or timestamps.
 */

import { sha256, toBytes, toHex, type Hex } from "viem";

export type BytesLike = Uint8Array | Hex | ArrayBuffer;

function toUint8Array(input: BytesLike): Uint8Array {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (typeof input === "string") {
    return toBytes(input as Hex);
  }
  return new Uint8Array(input);
}

/**
 * Hash raw content bytes with SHA-256.
 * Callers must pass only payload bytes — never filenames or mtimes.
 */
export function hashContent(data: BytesLike): Hex {
  return sha256(toUint8Array(data));
}

/**
 * Hash a UTF-8 string as content (encodes to bytes first).
 */
export function hashContentString(text: string): Hex {
  return sha256(toBytes(text));
}

/**
 * Convenience: hex-encode a hash that is already Hex (identity / normalize).
 */
export function normalizeHash(hash: Hex): Hex {
  return toHex(toBytes(hash));
}
