import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import { ZodError } from "zod";
import { config } from "./config.js";
import { healthRoutes } from "./routes/health.js";
import { afterimageRoutes } from "./routes/afterimages.js";
import { eventRoutes } from "./routes/events.js";
import { uploadRoutes } from "./routes/uploads.js";
import { verifyRoutes } from "./routes/verify.js";
import { aiRoutes } from "./routes/ai.js";
import { publicRoutes } from "./routes/public.js";
import { statusRoutes } from "./routes/status.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === "production" ? "info" : "debug",
    },
    requestIdHeader: "x-request-id",
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
  });

  await app.register(multipart, {
    limits: {
      fileSize: config.MAX_UPLOAD_SIZE,
      files: 1,
    },
  });

  await app.register(websocket);

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.code(400).send({
        error: "Validation failed",
        details: err.flatten(),
      });
    }
    const error = err as { statusCode?: number; message?: string };
    const status = error.statusCode ?? 500;
    app.log.error(err);
    return reply.code(status).send({
      error: status >= 500 ? "Internal server error" : error.message ?? "Request failed",
    });
  });

  await app.register(healthRoutes);
  await app.register(afterimageRoutes);
  await app.register(eventRoutes);
  await app.register(uploadRoutes);
  await app.register(verifyRoutes);
  await app.register(aiRoutes);
  await app.register(publicRoutes);
  await app.register(statusRoutes);

  return app;
}
