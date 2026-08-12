import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { closeQueues } from "./lib/queues.js";

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    await app.close();
    await closeQueues();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  app.log.info(`AFTERIMAGE API listening on ${config.API_HOST}:${config.API_PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
