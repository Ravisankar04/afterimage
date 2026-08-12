import { resolve } from "node:path";
import { config } from "../config.js";
import { LocalStorageProvider } from "./local.js";
import { S3StorageProvider } from "./s3.js";
import { IPFSStorageProvider } from "./ipfs.js";
import type { StorageProvider } from "./types.js";
import { generateStorageKey } from "./types.js";

export type { StorageProvider, PutObjectInput, PutObjectResult, GetObjectResult } from "./types.js";
export { generateStorageKey } from "./types.js";
export { LocalStorageProvider } from "./local.js";
export { S3StorageProvider } from "./s3.js";
export { IPFSStorageProvider } from "./ipfs.js";

let cached: StorageProvider | null = null;

export function createStorageProvider(): StorageProvider {
  switch (config.STORAGE_PROVIDER) {
    case "s3":
      return new S3StorageProvider({
        bucket: config.STORAGE_BUCKET ?? "",
        region: config.STORAGE_REGION,
        endpoint: config.STORAGE_ENDPOINT,
        accessKeyId: config.STORAGE_ACCESS_KEY,
        secretAccessKey: config.STORAGE_SECRET_KEY,
        publicBaseUrl: config.STORAGE_PUBLIC_BASE_URL,
      });
    case "ipfs":
      return new IPFSStorageProvider({
        apiUrl: config.IPFS_API_URL,
        gatewayUrl: config.IPFS_GATEWAY_URL,
      });
    case "local":
    default:
      return new LocalStorageProvider(resolve(config.STORAGE_LOCAL_PATH));
  }
}

export function getStorage(): StorageProvider {
  if (!cached) cached = createStorageProvider();
  return cached;
}

export function newObjectKey(extension?: string): string {
  return generateStorageKey(extension);
}
