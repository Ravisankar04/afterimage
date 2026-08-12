import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import { verifySchema } from "../schemas/index.js";
import { writeAudit } from "../lib/audit.js";
import { config } from "../config.js";

export const verifyRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/verify", async (req, reply) => {
    const body = verifySchema.parse(req.body);
    const hash = body.contentHash.toLowerCase();

    const evidence = body.evidenceId
      ? await prisma.evidence.findUnique({
          where: { id: body.evidenceId },
          include: {
            afterimage: true,
            storageObject: true,
          },
        })
      : await prisma.evidence.findFirst({
          where: {
            contentHash: { equals: hash, mode: "insensitive" },
            ...(body.afterimageId ? { afterimageId: body.afterimageId } : {}),
          },
          include: {
            afterimage: true,
            storageObject: true,
          },
        });

    const storageMatch = await prisma.storageObject.findFirst({
      where: { contentHash: { equals: hash, mode: "insensitive" } },
    });

    const chainEvents = await prisma.blockchainEvent.findMany({
      where: {
        removed: false,
        OR: [
          { args: { path: ["contentHash"], equals: body.contentHash } },
          ...(evidence?.onChainId
            ? [{ args: { path: ["evidenceId"], equals: evidence.onChainId } }]
            : []),
        ],
      },
      orderBy: { blockNumber: "desc" },
      take: 5,
    });

    const metadataOk =
      !body.metadataHash ||
      !evidence?.metadataHash ||
      evidence.metadataHash.toLowerCase() === body.metadataHash.toLowerCase();

    const verified = Boolean(
      (evidence && evidence.contentHash?.toLowerCase() === hash) ||
        (storageMatch && storageMatch.contentHash?.toLowerCase() === hash),
    );

    await writeAudit({
      action: "VERIFY",
      entityType: evidence ? "Evidence" : "ContentHash",
      entityId: evidence?.id,
      metadata: { contentHash: body.contentHash, verified },
    });

    const proof = chainEvents[0]
      ? {
          network: `chainId:${config.CHAIN_ID}`,
          contract: chainEvents[0].contractAddress,
          block: chainEvents[0].blockNumber.toString(),
          transaction: chainEvents[0].transactionHash,
          timestamp: chainEvents[0].timestamp,
          explorerUrl: config.BLOCK_EXPLORER_URL
            ? `${config.BLOCK_EXPLORER_URL.replace(/\/$/, "")}/tx/${chainEvents[0].transactionHash}`
            : null,
        }
      : null;

    return reply.send({
      verified,
      metadataMatch: metadataOk,
      evidence: evidence
        ? {
            id: evidence.id,
            type: evidence.type,
            contentHash: evidence.contentHash,
            metadataHash: evidence.metadataHash,
            storageReference: evidence.storageReference,
            afterimageId: evidence.afterimageId,
            afterimageTitle: evidence.afterimage.title,
            createdAt: evidence.createdAt,
          }
        : null,
      storageObject: storageMatch
        ? {
            id: storageMatch.id,
            uri: storageMatch.uri,
            contentHash: storageMatch.contentHash,
            mimeType: storageMatch.mimeType,
          }
        : null,
      blockchainProof: proof,
      note: proof
        ? undefined
        : "No indexed blockchain transaction yet — hash may be off-chain only until Anvil registration is indexed.",
    });
  });
};
