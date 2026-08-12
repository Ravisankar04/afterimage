/**
 * Deterministic AFTERIMAGE demo seed.
 * Wallet addresses: standard Anvil/Hardhat test accounts (safe for local demo).
 * Blockchain txHash fields stay null until the indexer records real Anvil txs.
 */

import { PrismaClient, type EvidenceType, type EventType } from "@prisma/client";

const prisma = new PrismaClient();

/** Anvil account #0–#9 */
const ANVIL = {
  a0: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  a1: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  a2: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  a3: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
  a4: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
  a5: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
  a6: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
  a7: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
  a8: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
  a9: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
} as const;

function d(iso: string): Date {
  return new Date(iso);
}

async function upsertUser(address: string, displayName?: string) {
  return prisma.user.upsert({
    where: { address: address.toLowerCase() },
    create: { address: address.toLowerCase(), displayName },
    update: { displayName },
  });
}

async function clearDemo() {
  // Order respects FKs
  await prisma.aIMessage.deleteMany();
  await prisma.aIConversation.deleteMany();
  await prisma.disputeEvidence.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.witnessConfirmation.deleteMany();
  await prisma.witness.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.afterimageEvent.deleteMany();
  await prisma.ownershipEvent.deleteMany();
  await prisma.blockchainEvent.deleteMany();
  await prisma.storageObject.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.jobReceipt.deleteMany();
  await prisma.afterimage.deleteMany();
}

async function seedTextileFactory(
  creator: { id: string },
  witnesses: Array<{ id: string; address: string }>,
) {
  const afterimage = await prisma.afterimage.create({
    data: {
      title: "OLD TEXTILE FACTORY",
      slug: "old-textile-factory-demo",
      type: "BUILDING",
      category: "ARCHITECTURE",
      description:
        "Demo: historic textile mill observed through renovation and demolition. Deterministic seed — not a live on-chain record until indexed.",
      status: "GONE",
      visibility: "APPROXIMATE",
      approximateLat: 41.8,
      approximateLng: -71.4,
      approximateLabel: "41.8, -71.4",
      firstObserved: d("2026-08-14T12:00:00.000Z"),
      lastObserved: d("2030-11-29T16:00:00.000Z"),
      yearFirst: 2026,
      yearLast: 2031,
      creatorId: creator.id,
      ownerId: creator.id,
      eventCount: 4,
      evidenceCount: 19,
      witnessCount: 8,
      processingStatus: "COMPLETE",
      embeddingText:
        "Old Textile Factory first observed August 2026 renovated 2028 last seen 2030 demolished 2031",
    },
  });

  const timeline: Array<{
    eventType: EventType;
    title: string;
    description: string;
    occurredAt: Date;
  }> = [
    {
      eventType: "OBSERVED",
      title: "First observed",
      description: "Building first documented in active industrial reuse.",
      occurredAt: d("2026-08-14T12:00:00.000Z"),
    },
    {
      eventType: "RENOVATED",
      title: "Renovated",
      description: "Facade and interior renovation documented.",
      occurredAt: d("2028-05-01T10:00:00.000Z"),
    },
    {
      eventType: "LAST_SEEN",
      title: "Last observed",
      description: "Final verified observation before clearance.",
      occurredAt: d("2030-11-29T16:00:00.000Z"),
    },
    {
      eventType: "DESTROYED",
      title: "Gone",
      description: "Structure demolished; only AFTERIMAGE remains.",
      occurredAt: d("2031-03-12T09:00:00.000Z"),
    },
  ];

  let parentId: string | null = null;
  const eventIds: string[] = [];
  for (const t of timeline) {
    const ev = await prisma.afterimageEvent.create({
      data: {
        afterimageId: afterimage.id,
        parentEventId: parentId,
        creatorId: creator.id,
        eventType: t.eventType,
        title: t.title,
        description: t.description,
        occurredAt: t.occurredAt,
        processingStatus: "COMPLETE",
        // contentHash / on-chain ids null until real registration
      },
    });
    eventIds.push(ev.id);
    parentId = ev.id;
  }

  await prisma.afterimage.update({
    where: { id: afterimage.id },
    data: { currentEventId: eventIds[eventIds.length - 1] },
  });

  await prisma.ownershipEvent.create({
    data: {
      afterimageId: afterimage.id,
      kind: "CREATED",
      toUserId: creator.id,
      txHash: null,
    },
  });

  // 12 photographs, 3 videos, 4 documents
  const evidencePlan: Array<{ type: EvidenceType; title: string; eventIndex: number }> = [
    ...Array.from({ length: 12 }, (_, i) => ({
      type: "PHOTO" as const,
      title: `Textile factory photo ${i + 1}`,
      eventIndex: i < 4 ? 0 : i < 8 ? 1 : i < 11 ? 2 : 3,
    })),
    ...Array.from({ length: 3 }, (_, i) => ({
      type: "VIDEO" as const,
      title: `Textile factory video ${i + 1}`,
      eventIndex: i,
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      type: "DOCUMENT" as const,
      title: `Textile factory document ${i + 1}`,
      eventIndex: Math.min(i, 3),
    })),
  ];

  for (const e of evidencePlan) {
    await prisma.evidence.create({
      data: {
        afterimageId: afterimage.id,
        eventId: eventIds[e.eventIndex],
        creatorId: creator.id,
        type: e.type,
        title: e.title,
        description: `Demo ${e.type.toLowerCase()} for OLD TEXTILE FACTORY`,
        visibility: "PUBLIC",
        processingStatus: "COMPLETE",
        embeddingText: `${e.title}. Part of deterministic demo seed for RAG.`,
        contentHash: null,
      },
    });
  }

  // 8 witnesses
  for (let i = 0; i < 8; i++) {
    const wUser = witnesses[i]!;
    const eventId = eventIds[Math.min(i % eventIds.length, eventIds.length - 1)]!;
    const witness = await prisma.witness.create({
      data: {
        afterimageId: afterimage.id,
        eventId,
        userId: wUser.id,
        statement: `I witnessed the state of the textile factory (demo witness ${i + 1}).`,
      },
    });
    await prisma.witnessConfirmation.create({
      data: {
        witnessId: witness.id,
        eventId,
        userId: wUser.id,
      },
    });
  }

  return afterimage;
}

async function seedSimple(
  title: string,
  slug: string,
  opts: {
    type: "ARTWORK" | "BUILDING" | "EVENT";
    category: "ART" | "ARCHITECTURE" | "EVENTS";
    status: "ACTIVE" | "GONE" | "LAST_SEEN";
    description: string;
    first: string;
    last?: string;
    creatorId: string;
    lat: number;
    lng: number;
  },
) {
  const firstObserved = d(opts.first);
  const lastObserved = opts.last ? d(opts.last) : firstObserved;
  const afterimage = await prisma.afterimage.create({
    data: {
      title,
      slug,
      type: opts.type,
      category: opts.category,
      description: opts.description,
      status: opts.status,
      visibility: "APPROXIMATE",
      approximateLat: Math.round(opts.lat * 10) / 10,
      approximateLng: Math.round(opts.lng * 10) / 10,
      approximateLabel: `${(Math.round(opts.lat * 10) / 10).toFixed(1)}, ${(Math.round(opts.lng * 10) / 10).toFixed(1)}`,
      firstObserved,
      lastObserved,
      yearFirst: firstObserved.getUTCFullYear(),
      yearLast: lastObserved.getUTCFullYear(),
      creatorId: opts.creatorId,
      ownerId: opts.creatorId,
      eventCount: 1,
      evidenceCount: 2,
      witnessCount: 1,
      processingStatus: "COMPLETE",
      embeddingText: `${title}. ${opts.description}`,
    },
  });

  const ev = await prisma.afterimageEvent.create({
    data: {
      afterimageId: afterimage.id,
      creatorId: opts.creatorId,
      eventType: opts.status === "GONE" ? "DESTROYED" : "OBSERVED",
      title: "Recorded",
      description: opts.description,
      occurredAt: firstObserved,
      processingStatus: "COMPLETE",
    },
  });

  await prisma.afterimage.update({
    where: { id: afterimage.id },
    data: { currentEventId: ev.id },
  });

  await prisma.ownershipEvent.create({
    data: {
      afterimageId: afterimage.id,
      kind: "CREATED",
      toUserId: opts.creatorId,
      txHash: null,
    },
  });

  for (const [i, type] of (["PHOTO", "DOCUMENT"] as const).entries()) {
    await prisma.evidence.create({
      data: {
        afterimageId: afterimage.id,
        eventId: ev.id,
        creatorId: opts.creatorId,
        type,
        title: `${title} ${type.toLowerCase()} ${i + 1}`,
        description: `Demo evidence for ${title}`,
        visibility: "PUBLIC",
        processingStatus: "COMPLETE",
        embeddingText: `${title} ${type}`,
      },
    });
  }

  return afterimage;
}

async function main() {
  console.log("Seeding AFTERIMAGE demo data…");
  await clearDemo();

  const creator = await upsertUser(ANVIL.a0, "Demo Creator (Anvil #0)");
  const witnessUsers = await Promise.all(
    [ANVIL.a1, ANVIL.a2, ANVIL.a3, ANVIL.a4, ANVIL.a5, ANVIL.a6, ANVIL.a7, ANVIL.a8].map((a, i) =>
      upsertUser(a, `Demo Witness ${i + 1}`),
    ),
  );

  const textile = await seedTextileFactory(creator, witnessUsers);

  const art = await seedSimple("TEMPORARY ART INSTALLATION", "temporary-art-installation-demo", {
    type: "ARTWORK",
    category: "ART",
    status: "LAST_SEEN",
    description: "Demo: ephemeral outdoor installation — deterministic seed.",
    first: "2027-06-01T15:00:00.000Z",
    last: "2027-08-20T20:00:00.000Z",
    creatorId: creator.id,
    lat: 40.72,
    lng: -74.0,
  });

  const theater = await seedSimple("DEMOLISHED THEATER", "demolished-theater-demo", {
    type: "BUILDING",
    category: "ARCHITECTURE",
    status: "GONE",
    description: "Demo: neighborhood theater documented before demolition.",
    first: "2025-01-10T12:00:00.000Z",
    last: "2026-09-01T12:00:00.000Z",
    creatorId: creator.id,
    lat: 34.05,
    lng: -118.25,
  });

  const market = await seedSimple("POP-UP MARKET", "pop-up-market-demo", {
    type: "EVENT",
    category: "EVENTS",
    status: "ACTIVE",
    description: "Demo: seasonal pop-up market with rotating vendors.",
    first: "2026-11-01T10:00:00.000Z",
    creatorId: creator.id,
    lat: 51.5,
    lng: -0.12,
  });

  // One witness on art installation
  const w = await prisma.witness.create({
    data: {
      afterimageId: art.id,
      eventId: (await prisma.afterimageEvent.findFirst({ where: { afterimageId: art.id } }))!.id,
      userId: witnessUsers[0]!.id,
      statement: "I attended the temporary art installation (demo).",
    },
  });
  await prisma.witnessConfirmation.create({
    data: {
      witnessId: w.id,
      eventId: w.eventId!,
      userId: witnessUsers[0]!.id,
    },
  });

  console.log("Seeded afterimages:");
  console.log(" -", textile.title, textile.id);
  console.log(" -", art.title, art.id);
  console.log(" -", theater.title, theater.id);
  console.log(" -", market.title, market.id);
  console.log("Creator wallet:", ANVIL.a0);
  console.log("Note: blockchain txHash fields left null until real Anvil indexing.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
