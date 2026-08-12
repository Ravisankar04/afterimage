import { config as loadEnv } from "dotenv";
import { z } from "zod";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  SESSION_SECRET: z.string().min(16),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  RPC_URL: z.string().default("http://127.0.0.1:8545"),
  CHAIN_ID: z.coerce.number().int().default(31337),
  DEPLOYER_PRIVATE_KEY: z.string().optional(),
  CONFIRMATIONS_REQUIRED: z.coerce.number().int().min(0).default(3),
  AFTERIMAGE_REGISTRY_ADDRESS: z.string().optional(),
  EVIDENCE_REGISTRY_ADDRESS: z.string().optional(),
  WITNESS_REGISTRY_ADDRESS: z.string().optional(),
  DISPUTE_REGISTRY_ADDRESS: z.string().optional(),
  OWNERSHIP_REGISTRY_ADDRESS: z.string().optional(),
  EVENT_REGISTRY_ADDRESS: z.string().optional(),
  BLOCK_EXPLORER_URL: z.string().optional(),

  STORAGE_PROVIDER: z.enum(["local", "s3", "ipfs"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./storage"),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_REGION: z.string().default("us-east-1"),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  IPFS_API_URL: z.string().default("http://127.0.0.1:5001"),
  IPFS_GATEWAY_URL: z.string().default("http://127.0.0.1:8080/ipfs"),

  MAX_UPLOAD_SIZE: z.coerce.number().int().positive().default(52_428_800),
  ALLOWED_UPLOAD_EXTENSIONS: z
    .string()
    .default(".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm,.mov,.mp3,.wav,.pdf,.txt,.json"),

  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().default("gpt-4o-mini"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
});

export type AppConfig = z.infer<typeof envSchema> & {
  allowedExtensions: Set<string>;
};

function parseConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    // Allow boot with defaults in development when DATABASE_URL missing only for typecheck
    if (process.env.NODE_ENV === "test" || process.env.SKIP_ENV_VALIDATION === "1") {
      const fallback = envSchema.parse({
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://afterimage:afterimage@localhost:5432/afterimage",
        SESSION_SECRET: process.env.SESSION_SECRET ?? "dev-session-secret-min-16",
      });
      return {
        ...fallback,
        allowedExtensions: new Set(
          fallback.ALLOWED_UPLOAD_EXTENSIONS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
        ),
      };
    }
    throw new Error(`Invalid environment: ${msg}`);
  }
  const data = parsed.data;
  return {
    ...data,
    allowedExtensions: new Set(
      data.ALLOWED_UPLOAD_EXTENSIONS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean),
    ),
  };
}

export const config = parseConfig();
