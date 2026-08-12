import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { GetObjectResult, PutObjectInput, PutObjectResult, StorageProvider } from "./types.js";

export type S3StorageConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicBaseUrl?: string;
  forcePathStyle?: boolean;
};

/**
 * S3-compatible storage. Credentials stay in the client config and are never returned.
 */
export class S3StorageProvider implements StorageProvider {
  readonly kind = "s3" as const;
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;

  constructor(cfg: S3StorageConfig) {
    if (!cfg.bucket) throw new Error("STORAGE_BUCKET is required for S3 provider");
    this.bucket = cfg.bucket;
    this.publicBaseUrl = cfg.publicBaseUrl;
    this.client = new S3Client({
      region: cfg.region,
      endpoint: cfg.endpoint,
      forcePathStyle: cfg.forcePathStyle ?? Boolean(cfg.endpoint),
      credentials:
        cfg.accessKeyId && cfg.secretAccessKey
          ? { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey }
          : undefined,
    });
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const body =
      Buffer.isBuffer(input.body) || input.body instanceof Uint8Array
        ? Buffer.from(input.body)
        : input.body;

    const result = await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: body,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        Metadata: input.metadata,
      }),
    );

    const byteSize =
      input.contentLength ??
      (Buffer.isBuffer(body) || body instanceof Uint8Array ? body.byteLength : 0);

    return {
      key: input.key,
      uri: `s3://${this.bucket}/${input.key}`,
      byteSize,
      etag: result.ETag,
    };
  }

  async getObject(key: string): Promise<GetObjectResult> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty S3 object body");
    const body = Buffer.from(bytes);
    return {
      body,
      contentType: result.ContentType ?? "application/octet-stream",
      byteSize: body.byteLength,
    };
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string | null> {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
  }
}
