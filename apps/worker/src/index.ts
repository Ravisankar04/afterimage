import { Worker, Queue, type Job, type ConnectionOptions } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv();

const prisma = new PrismaClient();

const QUEUE_NAMES = [
  "file-processing",
  "hashing",
  "storage",
  "blockchain-registration",
  "blockchain-indexing",
  "ai-processing",
  "notifications",
] as const;

type QueueName = (typeof QUEUE_NAMES)[number];
const DEAD_LETTER = "dead-letter";

type JobPayload = {
  idempotencyKey: string;
  afterimageId?: string;
  evidenceId?: string;
  eventId?: string;
  storageObjectId?: string;
  userId?: string;
  stage?: string;
};

function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
  };
}

const connection = redisConnection();
const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 4);
const confirmationsRequired = Number(process.env.CONFIRMATIONS_REQUIRED ?? 3);

const dlq = new Queue(DEAD_LETTER, {
  connection,
  defaultJobOptions: {
    removeOnComplete: 5_000,
    removeOnFail: false,
  },
});

async function claimIdempotent(
  queue: string,
  idempotencyKey: string,
  jobId: string,
): Promise<"proceed" | "skip"> {
  try {
    const existing = await prisma.jobReceipt.findUnique({
      where: { queue_idempotencyKey: { queue, idempotencyKey } },
    });
    if (existing && (existing.status === "completed" || existing.status === "active")) {
      return "skip";
    }
    await prisma.jobReceipt.upsert({
      where: { queue_idempotencyKey: { queue, idempotencyKey } },
      create: {
        queue,
        jobId,
        idempotencyKey,
        status: "active",
      },
      update: {
        jobId,
        status: "active",
        error: null,
      },
    });
    return "proceed";
  } catch {
    return "proceed";
  }
}

async function completeReceipt(
  queue: string,
  idempotencyKey: string,
  result?: object,
): Promise<void> {
  await prisma.jobReceipt.updateMany({
    where: { queue, idempotencyKey },
    data: { status: "completed", result: result ?? {}, error: null },
  });
}

async function failReceipt(queue: string, idempotencyKey: string, error: string): Promise<void> {
  await prisma.jobReceipt.updateMany({
    where: { queue, idempotencyKey },
    data: { status: "failed", error },
  });
}

async function sendToDlq(job: Job<JobPayload>, err: unknown): Promise<void> {
  await dlq.add(
    job.queueName,
    {
      ...job.data,
      failedReason: err instanceof Error ? err.message : String(err),
      originalQueue: job.queueName,
      originalJobId: job.id,
      attemptsMade: job.attemptsMade,
    },
    { jobId: `dlq:${job.queueName}:${job.id}:${job.attemptsMade}` },
  );
}

async function hashStorageObject(storageObjectId: string): Promise<string> {
  const obj = await prisma.storageObject.findUniqueOrThrow({ where: { id: storageObjectId } });
  const localRoot = resolve(process.env.STORAGE_LOCAL_PATH ?? "./storage");
  // Local provider stores under STORAGE_LOCAL_PATH/key
  let bytes: Buffer;
  if (obj.provider === "LOCAL") {
    bytes = await readFile(resolve(localRoot, obj.storageKey));
  } else {
    // For S3/IPFS, worker expects content already available via URI fetch in production.
    // Hash uri string as placeholder only when bytes unavailable — mark incomplete.
    throw new Error(`Hashing for provider ${obj.provider} requires downloaded bytes`);
  }
  const hash = "0x" + createHash("sha256").update(bytes).digest("hex");
  await prisma.storageObject.update({
    where: { id: storageObjectId },
    data: { contentHash: hash },
  });
  await prisma.evidence.updateMany({
    where: { storageObjectId },
    data: { contentHash: hash, processingStatus: "STORING" },
  });
  return hash;
}

async function processFile(data: JobPayload): Promise<object> {
  if (data.evidenceId) {
    await prisma.evidence.update({
      where: { id: data.evidenceId },
      data: { processingStatus: "VALIDATING" },
    });
  }
  if (data.storageObjectId) {
    await hashStorageObject(data.storageObjectId);
  }
  if (data.evidenceId) {
    await prisma.evidence.update({
      where: { id: data.evidenceId },
      data: { processingStatus: "COMPLETE" },
    });
  }
  if (data.afterimageId) {
    await prisma.afterimage.update({
      where: { id: data.afterimageId },
      data: { processingStatus: "COMPLETE" },
    });
  }
  return { ok: true, stage: "COMPLETE" };
}

async function processHashing(data: JobPayload): Promise<object> {
  if (!data.storageObjectId) return { skipped: true };
  const hash = await hashStorageObject(data.storageObjectId);
  return { contentHash: hash };
}

async function processStorage(data: JobPayload): Promise<object> {
  // Storage already performed by API; worker verifies object exists / not quarantined
  if (!data.storageObjectId) return { skipped: true };
  const obj = await prisma.storageObject.findUnique({ where: { id: data.storageObjectId } });
  if (!obj) throw new Error("StorageObject missing");
  if (obj.quarantined) throw new Error("StorageObject quarantined");
  return { uri: obj.uri, key: obj.storageKey };
}

async function processBlockchainRegistration(data: JobPayload): Promise<object> {
  // Stub: mark processing stages; real contract writes when addresses configured
  const registry = process.env.AFTERIMAGE_REGISTRY_ADDRESS;
  if (data.afterimageId) {
    await prisma.afterimage.update({
      where: { id: data.afterimageId },
      data: { processingStatus: registry ? "BROADCASTING" : "COMPLETE" },
    });
  }
  if (data.evidenceId) {
    await prisma.evidence.update({
      where: { id: data.evidenceId },
      data: { processingStatus: registry ? "BROADCASTING" : "COMPLETE" },
    });
  }
  if (data.eventId) {
    await prisma.afterimageEvent.update({
      where: { id: data.eventId },
      data: { processingStatus: registry ? "BROADCASTING" : "COMPLETE" },
    });
  }
  // txHash intentionally null until a real Anvil transaction is mined & indexed
  return {
    pending: !registry,
    txHash: null,
    note: registry
      ? "Registry configured — wire ABI write in production deploy"
      : "No registry address; skipping broadcast (local-dev placeholder)",
  };
}

async function processBlockchainIndexing(): Promise<object> {
  const rpc = process.env.RPC_URL ?? "http://127.0.0.1:8545";
  const chainId = Number(process.env.CHAIN_ID ?? 31337);
  const client = createPublicClient({
    chain: { ...foundry, id: chainId },
    transport: http(rpc),
  });

  const state = await prisma.indexerState.upsert({
    where: { id: "default" },
    create: { id: "default", lastBlockNumber: 0n },
    update: {},
  });

  let head: bigint;
  try {
    head = await client.getBlockNumber();
  } catch (err) {
    throw new Error(`RPC unavailable: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Reorg awareness: verify cursor block hash when present
  if (state.lastBlockHash && state.lastBlockNumber > 0n) {
    try {
      const block = await client.getBlock({ blockNumber: state.lastBlockNumber });
      if (block.hash.toLowerCase() !== state.lastBlockHash.toLowerCase()) {
        const rewind =
          state.lastBlockNumber > BigInt(confirmationsRequired)
            ? state.lastBlockNumber - BigInt(confirmationsRequired)
            : 0n;
        await prisma.blockchainEvent.updateMany({
          where: { blockNumber: { gte: rewind } },
          data: { removed: true, finalized: false },
        });
        await prisma.indexerState.update({
          where: { id: "default" },
          data: { lastBlockNumber: rewind, lastBlockHash: null },
        });
        return { reorg: true, rewindTo: rewind.toString() };
      }
    } catch {
      // block missing → treat as reorg signal
      const rewind =
        state.lastBlockNumber > BigInt(confirmationsRequired)
          ? state.lastBlockNumber - BigInt(confirmationsRequired)
          : 0n;
      await prisma.blockchainEvent.updateMany({
        where: { blockNumber: { gte: rewind } },
        data: { removed: true, finalized: false },
      });
      await prisma.indexerState.update({
        where: { id: "default" },
        data: { lastBlockNumber: rewind, lastBlockHash: null },
      });
      return { reorg: true, rewindTo: rewind.toString() };
    }
  }

  // Advance cursor (event log fetch requires contract addresses — noop scan updates depth)
  const tip = await client.getBlock({ blockNumber: head });
  await prisma.indexerState.update({
    where: { id: "default" },
    data: { lastBlockNumber: head, lastBlockHash: tip.hash },
  });

  // Bump confirmation counts for unfinalized events
  const pending = await prisma.blockchainEvent.findMany({
    where: { removed: false, finalized: false },
    take: 200,
  });
  for (const ev of pending) {
    const conf = Number(head - ev.blockNumber) + 1;
    await prisma.blockchainEvent.update({
      where: { id: ev.id },
      data: {
        confirmations: conf,
        finalized: conf >= confirmationsRequired,
      },
    });
  }

  return {
    head: head.toString(),
    confirmationsUpdated: pending.length,
  };
}

async function processAi(data: JobPayload): Promise<object> {
  // Embeddings / RAG refresh stub — API memory engine handles interactive queries
  if (data.afterimageId) {
    const a = await prisma.afterimage.findUnique({ where: { id: data.afterimageId } });
    if (a && !a.embeddingText) {
      await prisma.afterimage.update({
        where: { id: a.id },
        data: { embeddingText: `${a.title}\n${a.description}` },
      });
    }
  }
  return { ok: true };
}

async function processNotifications(data: JobPayload): Promise<object> {
  // Placeholder channel — extend with email/webhook later
  console.log("[notifications]", data.stage ?? "notify", data.afterimageId, data.eventId);
  return { delivered: true };
}

const handlers: Record<QueueName, (data: JobPayload) => Promise<object>> = {
  "file-processing": processFile,
  hashing: processHashing,
  storage: processStorage,
  "blockchain-registration": processBlockchainRegistration,
  "blockchain-indexing": async () => processBlockchainIndexing(),
  "ai-processing": processAi,
  notifications: processNotifications,
};

function createWorker(name: QueueName): Worker<JobPayload> {
  const worker = new Worker<JobPayload>(
    name,
    async (job) => {
      const key = job.data.idempotencyKey || `${name}:${job.id}`;
      const claim = await claimIdempotent(name, key, String(job.id));
      if (claim === "skip") {
        return { idempotentSkip: true };
      }
      try {
        const result = await handlers[name](job.data);
        await completeReceipt(name, key, result);
        return result;
      } catch (err) {
        await failReceipt(name, key, err instanceof Error ? err.message : String(err));
        throw err;
      }
    },
    {
      connection,
      concurrency,
    },
  );

  worker.on("failed", (job, err) => {
    console.error(`[${name}] job failed`, job?.id, err.message);
    if (job && job.attemptsMade >= (job.opts.attempts ?? 5)) {
      void sendToDlq(job, err);
    }
  });

  worker.on("completed", (job) => {
    console.log(`[${name}] completed`, job.id);
  });

  return worker;
}

async function main() {
  console.log("AFTERIMAGE worker starting…");
  console.log("Queues:", QUEUE_NAMES.join(", "));
  console.log("Dead-letter:", DEAD_LETTER);

  const workers = QUEUE_NAMES.map((n) => createWorker(n));

  // Periodic indexing enqueue
  const indexingQueue = new Queue("blockchain-indexing", {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  const tick = async () => {
    await indexingQueue.add(
      "scan",
      { idempotencyKey: `index:${Date.now()}` },
      { jobId: `index-tick-${Math.floor(Date.now() / 15_000)}` },
    );
  };
  await tick();
  const interval = setInterval(() => void tick(), 15_000);

  const shutdown = async () => {
    clearInterval(interval);
    await Promise.all(workers.map((w) => w.close()));
    await indexingQueue.close();
    await dlq.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
