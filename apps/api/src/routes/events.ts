import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import {
  createEvidenceSchema,
  createWitnessSchema,
  createDisputeSchema,
} from "../schemas/index.js";
import { writeAudit } from "../lib/audit.js";
import { enqueue } from "../lib/queues.js";
import { statusHub } from "../lib/status-hub.js";

async function upsertUser(address: string) {
  return prisma.user.upsert({
    where: { address: address.toLowerCase() },
    create: { address: address.toLowerCase() },
    update: {},
  });
}

export const eventRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/events/:id/evidence", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = createEvidenceSchema.parse(req.body);

    const event = await prisma.afterimageEvent.findUnique({ where: { id } });
    if (!event) return reply.code(404).send({ error: "Event not found" });

    const user = await upsertUser(body.creatorAddress);

    let storageReference: string | undefined;
    if (body.storageObjectId) {
      const obj = await prisma.storageObject.findUnique({ where: { id: body.storageObjectId } });
      if (!obj || obj.quarantined) {
        return reply.code(400).send({ error: "Invalid storageObjectId" });
      }
      storageReference = obj.uri;
    }

    const evidence = await prisma.evidence.create({
      data: {
        afterimageId: event.afterimageId,
        eventId: event.id,
        creatorId: user.id,
        type: body.type,
        title: body.title,
        description: body.description,
        visibility: body.visibility,
        storageObjectId: body.storageObjectId,
        storageReference,
        contentHash: body.contentHash,
        metadataHash: body.metadataHash,
        processingStatus: body.storageObjectId ? "HASHING" : "COMPLETE",
      },
    });

    await prisma.afterimage.update({
      where: { id: event.afterimageId },
      data: { evidenceCount: { increment: 1 } },
    });

    const jobId = await enqueue("file-processing", {
      idempotencyKey: `evidence:${evidence.id}`,
      afterimageId: event.afterimageId,
      evidenceId: evidence.id,
      eventId: event.id,
      storageObjectId: body.storageObjectId,
      userId: user.id,
    });

    statusHub.publish({
      afterimageId: event.afterimageId,
      evidenceId: evidence.id,
      jobId,
      status: "HASHING",
      message: "Evidence queued for hashing / registration",
      progress: 30,
      at: new Date().toISOString(),
    });

    await writeAudit({
      userId: user.id,
      action: "CREATE",
      entityType: "Evidence",
      entityId: evidence.id,
    });

    return reply.code(201).send({ evidence, jobId });
  });

  app.post("/api/events/:id/witness", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = createWitnessSchema.parse(req.body);

    const event = await prisma.afterimageEvent.findUnique({ where: { id } });
    if (!event) return reply.code(404).send({ error: "Event not found" });

    const user = await upsertUser(body.witnessAddress);

    const witness = await prisma.witness.upsert({
      where: {
        afterimageId_userId_eventId: {
          afterimageId: event.afterimageId,
          userId: user.id,
          eventId: event.id,
        },
      },
      create: {
        afterimageId: event.afterimageId,
        eventId: event.id,
        userId: user.id,
        statement: body.statement,
        statementHash: body.contentHash,
        signature: body.signature,
        nonce: body.nonce,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
      update: {
        statement: body.statement,
        statementHash: body.contentHash,
        signature: body.signature,
        nonce: body.nonce,
        deadline: body.deadline ? new Date(body.deadline) : undefined,
      },
    });

    const confirmation = await prisma.witnessConfirmation.upsert({
      where: {
        witnessId_eventId: { witnessId: witness.id, eventId: event.id },
      },
      create: {
        witnessId: witness.id,
        eventId: event.id,
        userId: user.id,
        contentHash: body.contentHash,
        signature: body.signature,
      },
      update: {
        contentHash: body.contentHash,
        signature: body.signature,
        withdrawn: false,
        withdrawnAt: null,
      },
    });

    await prisma.afterimage.update({
      where: { id: event.afterimageId },
      data: { witnessCount: { increment: 1 } },
    });

    await enqueue("blockchain-registration", {
      idempotencyKey: `witness:${confirmation.id}`,
      afterimageId: event.afterimageId,
      eventId: event.id,
      userId: user.id,
    });

    await writeAudit({
      userId: user.id,
      action: "WITNESS",
      entityType: "WitnessConfirmation",
      entityId: confirmation.id,
    });

    return reply.code(201).send({ witness, confirmation });
  });

  app.post("/api/events/:id/dispute", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = createDisputeSchema.parse(req.body);

    const event = await prisma.afterimageEvent.findUnique({ where: { id } });
    if (!event) return reply.code(404).send({ error: "Event not found" });

    const claimant = await upsertUser(body.claimantAddress);

    const dispute = await prisma.dispute.create({
      data: {
        afterimageId: event.afterimageId,
        eventId: event.id,
        claimantId: claimant.id,
        reason: body.reason,
        reasonHash: body.reasonHash,
        status: "OPEN",
        evidenceLinks: {
          create: body.evidenceIds.map((evidenceId) => ({ evidenceId })),
        },
      },
      include: { evidenceLinks: true },
    });

    await prisma.afterimage.update({
      where: { id: event.afterimageId },
      data: { status: "CONTESTED" },
    });

    await enqueue("blockchain-registration", {
      idempotencyKey: `dispute:${dispute.id}`,
      afterimageId: event.afterimageId,
      eventId: event.id,
      userId: claimant.id,
    });

    await enqueue("notifications", {
      idempotencyKey: `notify:dispute:${dispute.id}`,
      afterimageId: event.afterimageId,
      eventId: event.id,
      userId: claimant.id,
      stage: "dispute-opened",
    });

    await writeAudit({
      userId: claimant.id,
      action: "DISPUTE",
      entityType: "Dispute",
      entityId: dispute.id,
    });

    return reply.code(201).send({ dispute });
  });
};
