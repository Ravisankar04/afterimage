import { Queue, type ConnectionOptions } from "bullmq";
import { config } from "../config.js";

export const QUEUE_NAMES = [
  "file-processing",
  "hashing",
  "storage",
  "blockchain-registration",
  "blockchain-indexing",
  "ai-processing",
  "notifications",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

export const DEAD_LETTER_QUEUE = "dead-letter";

export function redisConnection(): ConnectionOptions {
  const url = new URL(config.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
  };
}

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

const queues = new Map<string, Queue>();

export function getQueue(name: QueueName | typeof DEAD_LETTER_QUEUE): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: redisConnection(),
      defaultJobOptions,
    });
    queues.set(name, q);
  }
  return q;
}

export type ProcessingJobPayload = {
  idempotencyKey: string;
  afterimageId?: string;
  evidenceId?: string;
  eventId?: string;
  storageObjectId?: string;
  userId?: string;
  stage?: string;
};

export async function enqueue(
  name: QueueName,
  payload: ProcessingJobPayload,
  opts?: { jobId?: string; delay?: number },
): Promise<string> {
  const queue = getQueue(name);
  const job = await queue.add(name, payload, {
    jobId: opts?.jobId ?? payload.idempotencyKey,
    delay: opts?.delay,
  });
  return job.id ?? payload.idempotencyKey;
}

export async function closeQueues(): Promise<void> {
  await Promise.all([...queues.values()].map((q) => q.close()));
  queues.clear();
}
