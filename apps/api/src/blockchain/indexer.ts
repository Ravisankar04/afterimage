import type { Hex } from "viem";
import { prisma } from "../db.js";
import { config } from "../config.js";
import {
  BlockchainClient,
  INDEXED_EVENTS,
  mapLogToIndexed,
  type IndexedLog,
} from "./client.js";
import type { BlockchainEventName } from "@prisma/client";

const EVENT_NAME_MAP: Record<string, BlockchainEventName> = {
  AfterimageCreated: "AfterimageCreated",
  EventCreated: "EventCreated",
  EvidenceRegistered: "EvidenceRegistered",
  WitnessAdded: "WitnessAdded",
  DisputeCreated: "DisputeCreated",
  DisputeResolved: "DisputeResolved",
  OwnershipTransferred: "OwnershipTransferred",
  AfterimageMarkedGone: "AfterimageMarkedGone",
  AfterimageMarkedLastSeen: "AfterimageMarkedLastSeen",
  AfterimageArchived: "AfterimageArchived",
};

export type IndexerOptions = {
  confirmationsRequired?: number;
  maxRange?: bigint;
  maxRetries?: number;
};

/**
 * Blockchain indexer with:
 * - retries on RPC failure
 * - duplicate handling (unique txHash+logIndex+blockHash)
 * - confirmation depth
 * - reorg awareness (removed logs / blockHash mismatch)
 */
export class BlockchainIndexer {
  private readonly client: BlockchainClient;
  private readonly confirmationsRequired: number;
  private readonly maxRange: bigint;
  private readonly maxRetries: number;
  private running = false;

  constructor(client = new BlockchainClient(), opts: IndexerOptions = {}) {
    this.client = client;
    this.confirmationsRequired = opts.confirmationsRequired ?? config.CONFIRMATIONS_REQUIRED;
    this.maxRange = opts.maxRange ?? 2_000n;
    this.maxRetries = opts.maxRetries ?? 5;
  }

  async getCursor(): Promise<{ lastBlockNumber: bigint; lastBlockHash: string | null }> {
    const state = await prisma.indexerState.upsert({
      where: { id: "default" },
      create: { id: "default", lastBlockNumber: 0n },
      update: {},
    });
    return { lastBlockNumber: state.lastBlockNumber, lastBlockHash: state.lastBlockHash };
  }

  async setCursor(blockNumber: bigint, blockHash: string | null): Promise<void> {
    await prisma.indexerState.upsert({
      where: { id: "default" },
      create: { id: "default", lastBlockNumber: blockNumber, lastBlockHash: blockHash },
      update: { lastBlockNumber: blockNumber, lastBlockHash: blockHash },
    });
  }

  /**
   * Detect reorg: if stored blockHash at cursor no longer matches chain, rewind.
   */
  async detectAndHandleReorg(): Promise<boolean> {
    const cursor = await this.getCursor();
    if (!cursor.lastBlockHash || cursor.lastBlockNumber === 0n) return false;

    try {
      const block = await this.client.publicClient.getBlock({
        blockNumber: cursor.lastBlockNumber,
      });
      if (block.hash.toLowerCase() === cursor.lastBlockHash.toLowerCase()) {
        return false;
      }
    } catch {
      // Block missing — reorg or prune
    }

    // Mark events at/after cursor as removed; rewind one confirmation window
    const rewindTo =
      cursor.lastBlockNumber > BigInt(this.confirmationsRequired)
        ? cursor.lastBlockNumber - BigInt(this.confirmationsRequired)
        : 0n;

    await prisma.blockchainEvent.updateMany({
      where: { blockNumber: { gte: rewindTo } },
      data: { removed: true, finalized: false },
    });

    await this.setCursor(rewindTo, null);
    return true;
  }

  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const delay = Math.min(30_000, 500 * 2 ** attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastErr;
  }

  async persistLog(log: IndexedLog): Promise<"inserted" | "duplicate" | "removed"> {
    if (log.removed) {
      await prisma.blockchainEvent.updateMany({
        where: {
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
        },
        data: { removed: true, finalized: false },
      });
      return "removed";
    }

    const eventName = EVENT_NAME_MAP[log.eventName] ?? "Unknown";
    const head = await this.client.getBlockNumber();
    const confirmations =
      head >= log.blockNumber ? Number(head - log.blockNumber) + 1 : 0;
    const finalized = confirmations >= this.confirmationsRequired;

    try {
      await prisma.blockchainEvent.create({
        data: {
          eventName,
          contractAddress: log.address,
          blockNumber: log.blockNumber,
          blockHash: log.blockHash,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
          args: log.args as object,
          confirmations,
          finalized,
          removed: false,
        },
      });
      return "inserted";
    } catch (err: unknown) {
      // Unique constraint = duplicate
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002"
      ) {
        await prisma.blockchainEvent.updateMany({
          where: {
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
            blockHash: log.blockHash,
          },
          data: { confirmations, finalized },
        });
        return "duplicate";
      }
      throw err;
    }
  }

  async scanOnce(): Promise<{ from: bigint; to: bigint; processed: number }> {
    await this.detectAndHandleReorg();

    const addresses = Object.values(this.client.addresses).filter(Boolean) as Hex[];
    if (addresses.length === 0) {
      const head = await this.client.getBlockNumber();
      return { from: 0n, to: head, processed: 0 };
    }

    const cursor = await this.getCursor();
    const head = await this.withRetry(() => this.client.getBlockNumber());
    const safeHead =
      head > BigInt(this.confirmationsRequired)
        ? head - BigInt(Math.max(0, this.confirmationsRequired - 1))
        : head;

    if (safeHead <= cursor.lastBlockNumber) {
      return { from: cursor.lastBlockNumber, to: safeHead, processed: 0 };
    }

    const from = cursor.lastBlockNumber + 1n;
    const to = from + this.maxRange - 1n > safeHead ? safeHead : from + this.maxRange - 1n;

    const logs = await this.withRetry(() =>
      this.client.publicClient.getLogs({
        address: addresses,
        events: [...INDEXED_EVENTS],
        fromBlock: from,
        toBlock: to,
      }),
    );

    let processed = 0;
    for (const log of logs) {
      const indexed = mapLogToIndexed(log as Parameters<typeof mapLogToIndexed>[0]);
      await this.persistLog(indexed);
      processed += 1;
    }

    const tip = await this.client.publicClient.getBlock({ blockNumber: to });
    await this.setCursor(to, tip.hash);

    return { from, to, processed };
  }

  async startPolling(intervalMs = 8_000): Promise<void> {
    if (this.running) return;
    this.running = true;
    const loop = async () => {
      while (this.running) {
        try {
          await this.scanOnce();
        } catch (err) {
          console.error("[indexer] scan failed", err);
        }
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    };
    void loop();
  }

  stop(): void {
    this.running = false;
  }
}
