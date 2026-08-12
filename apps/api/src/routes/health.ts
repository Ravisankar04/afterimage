import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/health", async () => {
    let dbOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      status: dbOk ? "ok" : "degraded",
      service: "afterimage-api",
      time: new Date().toISOString(),
      database: dbOk ? "up" : "down",
    };
  });
};
