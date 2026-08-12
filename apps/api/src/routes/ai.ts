import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import { aiStorySchema } from "../schemas/index.js";
import { memoryEngine } from "../ai/memory-engine.js";
import { writeAudit } from "../lib/audit.js";
import { enqueue } from "../lib/queues.js";

export const aiRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/ai/story", async (req, reply) => {
    const body = aiStorySchema.parse(req.body);

    const afterimage = await prisma.afterimage.findUnique({ where: { id: body.afterimageId } });
    if (!afterimage) return reply.code(404).send({ error: "Afterimage not found" });

    let userId: string | undefined;
    if (body.userAddress) {
      const user = await prisma.user.upsert({
        where: { address: body.userAddress.toLowerCase() },
        create: { address: body.userAddress.toLowerCase() },
        update: {},
      });
      userId = user.id;
    }

    await enqueue("ai-processing", {
      idempotencyKey: `ai:story:${body.afterimageId}:${Date.now()}`,
      afterimageId: body.afterimageId,
      userId,
      stage: "story",
    });

    const result = await memoryEngine.ask({
      afterimageId: body.afterimageId,
      question: body.question,
      userId,
      conversationId: body.conversationId,
    });

    await writeAudit({
      userId,
      action: "AI_QUERY",
      entityType: "Afterimage",
      entityId: body.afterimageId,
      metadata: {
        insufficientEvidence: result.insufficientEvidence,
        citationCount: result.citations.length,
      },
    });

    return reply.send({
      conversationId: result.conversationId,
      answer: result.answer,
      citations: result.citations,
      segments: result.segments,
      insufficientEvidence: result.insufficientEvidence,
      policy: "Every factual claim cites evidence IDs. Fabrication is forbidden.",
    });
  });
};
