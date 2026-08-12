/**
 * Canonical JSON serialization and SHA-256 metadata hashing.
 * Keys are sorted recursively; undefined values are omitted.
 */

import { sha256, stringToBytes, type Hex } from "viem";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/**
 * Recursively sort object keys for deterministic serialization.
 */
export function canonicalize(value: unknown): JsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error("canonical JSON does not allow NaN or Infinity");
    }
    return value as JsonPrimitive;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    const out: JsonObject = {};
    for (const key of keys) {
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }

  throw new Error(`unsupported type for canonical JSON: ${typeof value}`);
}

/**
 * Deterministic JSON string (sorted keys, no whitespace).
 */
export function canonicalizeJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

/**
 * SHA-256 over canonical JSON metadata bytes (UTF-8).
 */
export function hashMetadata(metadata: unknown): Hex {
  const canonical = canonicalizeJson(metadata);
  return sha256(stringToBytes(canonical));
}
