import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import { publicLocationView } from "../lib/location.js";
import { config } from "../config.js";

/**
 * Public AFTERIMAGE page — no account required.
 * Only public / approximate location + public evidence.
 * Blockchain proof fields are null until indexed (never fake tx hashes).
 */
export const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/public/afterimages/:id", async (req, reply) => {
    const { id } = req.params as { id: string };

    const afterimage = await prisma.afterimage.findFirst({
      where: { OR: [{ id }, { slug: id }, { onChainId: id }] },
      include: {
        creator: { select: { address: true } },
        evidence: {
          where: { visibility: "PUBLIC", processingStatus: "COMPLETE" },
          select: {
            id: true,
            type: true,
            title: true,
            contentHash: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        },
        witnesses: {
          select: { id: true, user: { select: { address: true } }, createdAt: true },
          take: 50,
        },
        blockchainEvents: {
          where: { removed: false, finalized: true },
          orderBy: { blockNumber: "desc" },
          take: 5,
        },
      },
    });

    if (!afterimage) return reply.code(404).send({ error: "Afterimage not found" });

    const location = publicLocationView(afterimage);
    const latestChain = afterimage.blockchainEvents[0] ?? null;

    return reply.send({
      afterimage: {
        id: afterimage.id,
        slug: afterimage.slug,
        title: afterimage.title,
        type: afterimage.type,
        category: afterimage.category,
        description: afterimage.description,
        status: afterimage.status,
        firstObserved: afterimage.firstObserved,
        lastObserved: afterimage.lastObserved,
        eventCount: afterimage.eventCount,
        evidenceCount: afterimage.evidenceCount,
        witnessCount: afterimage.witnessCount,
        creator: afterimage.creator.address,
        location,
        evidence: afterimage.evidence,
        witnesses: afterimage.witnesses.map((w) => ({
          id: w.id,
          address: w.user.address,
          createdAt: w.createdAt,
        })),
      },
      blockchainProof: latestChain
        ? {
            network: `chainId:${config.CHAIN_ID}`,
            contract: latestChain.contractAddress,
            block: latestChain.blockNumber.toString(),
            transaction: latestChain.transactionHash,
            timestamp: latestChain.timestamp,
            contentHash: afterimage.metadataHash,
            metadataHash: afterimage.metadataHash,
            explorerUrl: config.BLOCK_EXPLORER_URL
              ? `${config.BLOCK_EXPLORER_URL.replace(/\/$/, "")}/tx/${latestChain.transactionHash}`
              : null,
          }
        : {
            network: `chainId:${config.CHAIN_ID}`,
            contract: config.AFTERIMAGE_REGISTRY_ADDRESS ?? null,
            block: null,
            transaction: null,
            timestamp: null,
            contentHash: afterimage.metadataHash,
            metadataHash: afterimage.metadataHash,
            explorerUrl: null,
            note: "Awaiting on-chain indexing — no placeholder transaction hashes.",
          },
    });
  });
};
