import type { GetObjectResult, PutObjectInput, PutObjectResult, StorageProvider } from "./types.js";

export type IpfsStorageConfig = {
  apiUrl: string;
  gatewayUrl: string;
};

/**
 * IPFS HTTP API storage. Never returns API credentials; URIs are ipfs://CID only.
 */
export class IPFSStorageProvider implements StorageProvider {
  readonly kind = "ipfs" as const;
  private readonly apiUrl: string;
  private readonly gatewayUrl: string;

  constructor(cfg: IpfsStorageConfig) {
    this.apiUrl = cfg.apiUrl.replace(/\/$/, "");
    this.gatewayUrl = cfg.gatewayUrl.replace(/\/$/, "");
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const buf =
      Buffer.isBuffer(input.body) || input.body instanceof Uint8Array
        ? Buffer.from(input.body)
        : await streamToBuffer(input.body);

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(buf)], { type: input.contentType }),
      input.key,
    );

    const res = await fetch(`${this.apiUrl}/api/v0/add?pin=true`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      throw new Error(`IPFS add failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { Hash: string; Size: string };
    return {
      key: input.key,
      uri: `ipfs://${json.Hash}`,
      byteSize: buf.byteLength,
      cid: json.Hash,
      etag: json.Hash,
    };
  }

  async getObject(key: string): Promise<GetObjectResult> {
    // key may be opaque storage key mapped in DB; prefer CID via gateway when key looks like CID
    const url = key.startsWith("Qm") || key.startsWith("bafy")
      ? `${this.gatewayUrl}/${key}`
      : `${this.gatewayUrl}/${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`IPFS get failed: ${res.status}`);
    const ab = await res.arrayBuffer();
    const body = Buffer.from(ab);
    return {
      body,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      byteSize: body.byteLength,
    };
  }

  async deleteObject(_key: string): Promise<void> {
    // IPFS content-addressed; unpin optional — no-op by default
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.getObject(key);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string): Promise<string | null> {
    const cid = key.includes("/") ? key.split("/").pop()! : key;
    return `${this.gatewayUrl}/${cid}`;
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
