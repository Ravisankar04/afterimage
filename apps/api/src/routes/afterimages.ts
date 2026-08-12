import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { createAfterimageSchema, listAfterimagesSchema, createEventSchema } from "../schemas/index.js";
import { approximateCoords, createLocationCommitment, publicLocationView } from "../lib/location.js";
import { writeAudit } from "../lib/audit.js";
import { enqueue } from "../lib/queues.js";
import { statusHub } from "../lib/status-hub.js";
import { nanoid } from "nanoid";

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `${base || "afterimage"}-${nanoid(8)}`;
}

async function upsertUser(address: string) {
  return prisma.user.upsert({
    where: { address: address.toLowerCase() },
    create: { address: address.toLowerCase() },
    update: {},
  });
}

function mapAfterimagePublic<T extends {
  visibility: "PUBLIC" | "APPROXIMATE" | "PRIVATE";
  latitude: number | null;
  longitude: number | null;
  approximateLat: number | null;
  approximateLng: number | null;
  approximateLabel: string | null;
  locationCommitment: string | null;
  locationSaltHash?: string | null;
}>(row: T) {
  const { locationSaltHash: _salt, ...rest } = row as T & { locationSaltHash?: string | null };
  void _salt;
  return {
    ...rest,
    location: publicLocationView(row),
    // Never leak salt / exact private coords in list/detail public mapper
    latitude: undefined,
    longitude: undefined,
    locationSaltHash: undefined,
  };
}

export const afterimageRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/afterimages", async (req, reply) => {
    const body = createAfterimageSchema.parse(req.body);
    const user = await upsertUser(body.creatorAddress);
    const firstObserved = new Date(body.firstObserved);
    if (Number.isNaN(firstObserved.getTime())) {
      return reply.code(400).send({ error: "Invalid firstObserved date" });
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    let approximateLabel: string | undefined;
    let approximateLat: number | undefined;
    let approximateLng: number | undefined;
    let locationCommitment: string | undefined;
    let locationSaltHash: string | undefined;
    let locationSaltOnce: string | undefined;

    if (body.latitude != null && body.longitude != null) {
      if (body.visibility === "PUBLIC") {
        latitude = body.latitude;
        longitude = body.longitude;
        const approx = approximateCoords(body.latitude, body.longitude);
        approximateLat = approx.approximateLat;
        approximateLng = approx.approximateLng;
        approximateLabel = approx.approximateLabel;
      } else if (body.visibility === "APPROXIMATE") {
        const approx = approximateCoords(body.latitude, body.longitude);
        approximateLat = approx.approximateLat;
        approximateLng = approx.approximateLng;
        approximateLabel = approx.approximateLabel;
      } else {
        const c = createLocationCommitment(body.latitude, body.longitude);
        locationCommitment = c.commitment;
        locationSaltHash = c.saltHash;
        // salt returned once to creator only — never logged / never stored plaintext
        locationSaltOnce = c.salt;
      }
    }

    const afterimage = await prisma.afterimage.create({
      data: {
        title: body.title,
        slug: slugify(body.title),
        type: body.type,
        category: body.category,
        description: body.description,
        visibility: body.visibility,
        latitude,
        longitude,
        approximateLabel,
        approximateLat,
        approximateLng,
        locationCommitment,
        locationSaltHash,
        firstObserved,
        lastObserved: firstObserved,
        yearFirst: firstObserved.getUTCFullYear(),
        yearLast: firstObserved.getUTCFullYear(),
        metadataHash: body.metadataHash,
        creatorId: user.id,
        ownerId: user.id,
        processingStatus: "SIGNING",
        eventCount: 1,
      },
    });

    const rootEvent = await prisma.afterimageEvent.create({
      data: {
        afterimageId: afterimage.id,
        creatorId: user.id,
        eventType: "CREATED",
        title: "Created",
        description: body.description,
        occurredAt: firstObserved,
        metadataHash: body.metadataHash,
        locationCommitment,
      },
    });

    await prisma.afterimage.update({
      where: { id: afterimage.id },
      data: { currentEventId: rootEvent.id },
    });

    await prisma.ownershipEvent.create({
      data: {
        afterimageId: afterimage.id,
        kind: "CREATED",
        toUserId: user.id,
        metadataHash: body.metadataHash,
        // txHash null until indexer fills from real Anvil txs
        txHash: null,
      },
    });

    const jobId = await enqueue("blockchain-registration", {
      idempotencyKey: `reg:${afterimage.id}`,
      afterimageId: afterimage.id,
      userId: user.id,
      stage: "BROADCASTING",
    });

    statusHub.publish({
      afterimageId: afterimage.id,
      jobId,
      status: "SIGNING",
      message: "Afterimage created; awaiting blockchain registration",
      progress: 40,
      at: new Date().toISOString(),
    });

    await writeAudit({
      userId: user.id,
      action: "CREATE",
      entityType: "Afterimage",
      entityId: afterimage.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return reply.code(201).send({
      afterimage: mapAfterimagePublic(afterimage),
      rootEventId: rootEvent.id,
      jobId,
      // Private location salt returned once — client must store securely; never logged
      locationSalt: locationSaltOnce,
    });
  });

  app.get("/api/afterimages", async (req, reply) => {
    const query = listAfterimagesSchema.parse(req.query);
    const where: Prisma.AfterimageWhereInput = {};

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { slug: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.type) where.type = query.type;
    if (query.category) where.category = query.category;
    if (query.status) where.status = query.status;
    if (query.year) {
      where.AND = [
        { yearFirst: { lte: query.year } },
        { OR: [{ yearLast: null }, { yearLast: { gte: query.year } }] },
      ];
    }
    if (query.yearFrom || query.yearTo) {
      where.yearFirst = {
        ...(query.yearFrom ? { gte: query.yearFrom } : {}),
        ...(query.yearTo ? { lte: query.yearTo } : {}),
      };
    }

    // Location filter only against approximate/public fields — never private exact coords
    if (query.lat != null && query.lng != null && query.radiusKm) {
      const deg = query.radiusKm / 111;
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            {
              visibility: "PUBLIC",
              latitude: { gte: query.lat - deg, lte: query.lat + deg },
              longitude: { gte: query.lng - deg, lte: query.lng + deg },
            },
            {
              visibility: "APPROXIMATE",
              approximateLat: { gte: query.lat - deg, lte: query.lat + deg },
              approximateLng: { gte: query.lng - deg, lte: query.lng + deg },
            },
          ],
        },
      ];
    }

    const items = await prisma.afterimage.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { address: true } },
        owner: { select: { address: true } },
      },
    });

    const hasMore = items.length > query.limit;
    const page = hasMore ? items.slice(0, query.limit) : items;

    return reply.send({
      items: page.map((a) => mapAfterimagePublic(a)),
      nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
    });
  });

  app.get("/api/afterimages/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const afterimage = await prisma.afterimage.findFirst({
      where: { OR: [{ id }, { slug: id }, { onChainId: id }] },
      include: {
        creator: { select: { id: true, address: true } },
        owner: { select: { id: true, address: true } },
        events: { orderBy: { occurredAt: "asc" }, take: 50 },
        evidence: {
          where: { visibility: { in: ["PUBLIC", "APPROXIMATE"] } },
          orderBy: { createdAt: "asc" },
          take: 50,
        },
        witnesses: { take: 50, include: { user: { select: { address: true } } } },
        disputes: { take: 20 },
        ownershipEvents: { orderBy: { createdAt: "asc" } },
        blockchainEvents: {
          where: { removed: false },
          orderBy: { blockNumber: "desc" },
          take: 20,
        },
      },
    });
    if (!afterimage) return reply.code(404).send({ error: "Afterimage not found" });
    return reply.send({ afterimage: mapAfterimagePublic(afterimage) });
  });

  app.post("/api/afterimages/:id/events", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = createEventSchema.parse(req.body);
    const afterimage = await prisma.afterimage.findUnique({ where: { id } });
    if (!afterimage) return reply.code(404).send({ error: "Afterimage not found" });

    const user = await upsertUser(body.creatorAddress);
    const occurredAt = new Date(body.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      return reply.code(400).send({ error: "Invalid occurredAt" });
    }

    if (body.parentEventId) {
      const parent = await prisma.afterimageEvent.findFirst({
        where: { id: body.parentEventId, afterimageId: id },
      });
      if (!parent) return reply.code(400).send({ error: "Invalid parentEventId" });
    }

    const event = await prisma.afterimageEvent.create({
      data: {
        afterimageId: id,
        parentEventId: body.parentEventId ?? afterimage.currentEventId,
        creatorId: user.id,
        eventType: body.eventType,
        title: body.title,
        description: body.description,
        occurredAt,
        contentHash: body.contentHash,
        metadataHash: body.metadataHash,
        locationCommitment: body.locationCommitment,
        processingStatus: "BROADCASTING",
      },
    });

    const statusUpdate =
      body.eventType === "DESTROYED" || body.eventType === "LAST_SEEN"
        ? body.eventType === "DESTROYED"
          ? ("GONE" as const)
          : ("LAST_SEEN" as const)
        : body.eventType === "RENOVATED" || body.eventType === "MODIFIED"
          ? ("CHANGING" as const)
          : undefined;

    await prisma.afterimage.update({
      where: { id },
      data: {
        currentEventId: event.id,
        lastObserved: occurredAt,
        yearLast: occurredAt.getUTCFullYear(),
        eventCount: { increment: 1 },
        ...(statusUpdate ? { status: statusUpdate } : {}),
      },
    });

    const jobId = await enqueue("blockchain-registration", {
      idempotencyKey: `event:${event.id}`,
      afterimageId: id,
      eventId: event.id,
      userId: user.id,
    });

    await writeAudit({
      userId: user.id,
      action: "CREATE",
      entityType: "AfterimageEvent",
      entityId: event.id,
    });

    return reply.code(201).send({ event, jobId });
  });

  app.get("/api/afterimages/:id/history", async (req, reply) => {
    const { id } = req.params as { id: string };
    const afterimage = await prisma.afterimage.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true, title: true, status: true },
    });
    if (!afterimage) return reply.code(404).send({ error: "Afterimage not found" });

    const events = await prisma.afterimageEvent.findMany({
      where: { afterimageId: afterimage.id },
      orderBy: { occurredAt: "asc" },
      include: {
        evidence: {
          where: { visibility: { in: ["PUBLIC", "APPROXIMATE"] } },
          select: {
            id: true,
            type: true,
            title: true,
            contentHash: true,
            createdAt: true,
          },
        },
        witnesses: {
          include: { user: { select: { address: true } } },
        },
        disputes: { select: { id: true, status: true, reason: true } },
        children: { select: { id: true } },
      },
    });

    const nodes = events.map((e) => ({
      id: e.id,
      parentEventId: e.parentEventId,
      eventType: e.eventType,
      title: e.title,
      description: e.description,
      occurredAt: e.occurredAt,
      contentHash: e.contentHash,
      childIds: e.children.map((c) => c.id),
      evidence: e.evidence,
      witnesses: e.witnesses,
      disputes: e.disputes,
    }));

    return reply.send({
      afterimageId: afterimage.id,
      title: afterimage.title,
      status: afterimage.status,
      nodes,
    });
  });
};
