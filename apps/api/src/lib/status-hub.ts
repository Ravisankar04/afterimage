import type { ProcessingStatus } from "@prisma/client";

export type StatusUpdate = {
  afterimageId?: string;
  evidenceId?: string;
  jobId?: string;
  status: ProcessingStatus | string;
  message?: string;
  progress?: number;
  at: string;
};

type Subscriber = (update: StatusUpdate) => void;

/**
 * In-process pub/sub for SSE / WebSocket processing status.
 */
class StatusHub {
  private readonly subs = new Set<Subscriber>();
  private readonly byEntity = new Map<string, Set<Subscriber>>();

  subscribe(fn: Subscriber, entityKey?: string): () => void {
    this.subs.add(fn);
    if (entityKey) {
      let set = this.byEntity.get(entityKey);
      if (!set) {
        set = new Set();
        this.byEntity.set(entityKey, set);
      }
      set.add(fn);
    }
    return () => {
      this.subs.delete(fn);
      if (entityKey) {
        this.byEntity.get(entityKey)?.delete(fn);
      }
    };
  }

  publish(update: StatusUpdate): void {
    const payload = { ...update, at: update.at || new Date().toISOString() };
    for (const fn of this.subs) {
      try {
        fn(payload);
      } catch {
        // ignore subscriber errors
      }
    }
    const keys = [update.afterimageId, update.evidenceId, update.jobId].filter(Boolean) as string[];
    for (const key of keys) {
      const set = this.byEntity.get(key);
      if (!set) continue;
      for (const fn of set) {
        try {
          fn(payload);
        } catch {
          // ignore
        }
      }
    }
  }
}

export const statusHub = new StatusHub();
