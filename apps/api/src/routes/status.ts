import type { FastifyPluginAsync } from "fastify";
import { statusHub, type StatusUpdate } from "../lib/status-hub.js";

/**
 * Real-time processing status via SSE and WebSocket.
 * Stages: UPLOADING → VALIDATING → HASHING → STORING → SIGNING →
 * BROADCASTING → CONFIRMING → INDEXING → COMPLETE
 */
export const statusRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/status/stream", async (req, reply) => {
    const q = req.query as { afterimageId?: string; jobId?: string };
    const entityKey = q.afterimageId || q.jobId;

    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    reply.raw.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

    const send = (update: StatusUpdate) => {
      if (q.afterimageId && update.afterimageId && update.afterimageId !== q.afterimageId) return;
      if (q.jobId && update.jobId && update.jobId !== q.jobId) return;
      reply.raw.write(`event: status\ndata: ${JSON.stringify(update)}\n\n`);
    };

    const unsubscribe = statusHub.subscribe(send, entityKey);

    const heartbeat = setInterval(() => {
      reply.raw.write(`: ping\n\n`);
    }, 15_000);

    req.raw.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  });

  app.get("/ws", { websocket: true }, (socket, req) => {
    const url = new URL(req.url, "http://localhost");
    const afterimageId = url.searchParams.get("afterimageId") ?? undefined;
    const jobId = url.searchParams.get("jobId") ?? undefined;
    const entityKey = afterimageId || jobId || undefined;

    socket.send(JSON.stringify({ type: "ready", ok: true }));

    const send = (update: StatusUpdate) => {
      if (afterimageId && update.afterimageId && update.afterimageId !== afterimageId) return;
      if (jobId && update.jobId && update.jobId !== jobId) return;
      try {
        socket.send(JSON.stringify({ type: "status", ...update }));
      } catch {
        // closed
      }
    };

    const unsubscribe = statusHub.subscribe(send, entityKey);

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string };
        if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", at: new Date().toISOString() }));
        }
      } catch {
        // ignore
      }
    });

    socket.on("close", () => unsubscribe());
  });
};
