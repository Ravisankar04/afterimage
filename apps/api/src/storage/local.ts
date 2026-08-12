import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { GetObjectResult, PutObjectInput, PutObjectResult, StorageProvider } from "./types.js";

function assertSafeKey(key: string, root: string): string {
  if (!key || key.includes("\0") || key.includes("..") || key.startsWith("/") || key.startsWith("\\")) {
    throw new Error("Invalid storage key");
  }
  const full = resolve(root, key);
  const normalizedRoot = resolve(root) + sep;
  if (!full.startsWith(normalizedRoot) && full !== resolve(root)) {
    throw new Error("Path traversal rejected");
  }
  return full;
}

export class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;

  constructor(private readonly rootDir: string) {}

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const full = assertSafeKey(input.key, this.rootDir);
    await fs.mkdir(dirname(full), { recursive: true });

    let byteSize = input.contentLength ?? 0;
    if (Buffer.isBuffer(input.body) || input.body instanceof Uint8Array) {
      const buf = Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
      await fs.writeFile(full, buf);
      byteSize = buf.byteLength;
    } else {
      const writable = createWriteStream(full);
      await pipeline(input.body as Readable, writable);
      const stat = await fs.stat(full);
      byteSize = stat.size;
    }

    return {
      key: input.key,
      uri: `file://${normalize(input.key).replace(/\\/g, "/")}`,
      byteSize,
    };
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const full = assertSafeKey(key, this.rootDir);
    const body = await fs.readFile(full);
    return {
      body,
      contentType: "application/octet-stream",
      byteSize: body.byteLength,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const full = assertSafeKey(key, this.rootDir);
    await fs.unlink(full).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") throw err;
    });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(assertSafeKey(key, this.rootDir));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(): Promise<string | null> {
    return null;
  }

  createReadStream(key: string) {
    return createReadStream(assertSafeKey(key, this.rootDir));
  }

  resolvePath(key: string): string {
    return assertSafeKey(key, this.rootDir);
  }

  get root(): string {
    return join(this.rootDir);
  }
}
