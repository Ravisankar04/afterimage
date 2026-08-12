/**
 * Deterministic SHA-256 of an ArrayBuffer using Web Crypto.
 */
export async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256File(file: File | Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  return sha256Hex(buffer);
}

export function shortHash(hash: string, head = 8, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}
