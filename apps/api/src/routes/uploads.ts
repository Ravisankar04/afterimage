import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../db.js";
import { getStorage, newObjectKey } from "../storage/index.js";
import { validateUpload } from "../storage/security.js";
import { uploadMetaSchema } from "../schemas/index.js";
import { enqueue } from "../lib/queues.js";
import { statusHub } from "../lib/status-hub.js";
import { writeAudit } from "../lib/audit.js";
import { config } from "../config.js";
import type { StorageProviderKind } from "@prisma/client";

const providerKind = (): StorageProviderKind => {
  switch (config.STORAGE_PROVIDER) {
    case "s3":
      return "S3";
    case "ipfs":
      return "IPFS";
    default:
      return "LOCAL";
  }
};

export const uploadRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/uploads", async (req, reply) => {
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "multipart file required" });

    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(file.fields)) {
      const v = value as { value?: string } | undefined;
      if (v && typeof v.value === "string") fields[key] = v.value;
    }
    const meta = uploadMetaSchema.parse(fields);

    const buffer = await file.toBuffer();
    const validation = await validateUpload({
      originalFilename: file.filename,
      buffer,
      claimedMime: file.mimetype,
    });

    if (!validation.ok) {
      return reply.code(400).send({
        error: validation.reason,
        code: validation.code,
      });
    }

    const key = newObjectKey(validation.extension);
    const storage = getStorage();

    statusHub.publish({
      afterimageId: meta.afterimageId,
      status: "UPLOADING",
      message: "Storing object",
      progress: 15,
      at: new Date().toISOString(),
    });

    const put = await storage.putObject({
      key,
      body: buffer,
      contentType: validation.detectedMime,
      contentLength: buffer.byteLength,
    });

    let uploaderId: string | undefined;
    if (meta.uploaderAddress) {
      const user = await prisma.user.upsert({
        where: { address: meta.uploaderAddress.toLowerCase() },
        create: { address: meta.uploaderAddress.toLowerCase() },
        update: {},
      });
      uploaderId = user.id;
    }

    const storageObject = await prisma.storageObject.create({
      data: {
        storageKey: key,
        provider: providerKind(),
        bucket: config.STORAGE_BUCKET,
        uri: put.uri,
        mimeType: validation.detectedMime,
        byteSize: put.byteSize,
        originalFilename: validation.safeFilename,
        uploaderId,
        afterimageId: meta.afterimageId,
      },
    });

    const jobId = await enqueue("storage", {
      idempotencyKey: `storage:${storageObject.id}`,
      storageObjectId: storageObject.id,
      afterimageId: meta.afterimageId,
      userId: uploaderId,
      stage: "STORING",
    });

    await enqueue("hashing", {
      idempotencyKey: `hash:storage:${storageObject.id}`,
      storageObjectId: storageObject.id,
      afterimageId: meta.afterimageId,
      userId: uploaderId,
    });

    statusHub.publish({
      afterimageId: meta.afterimageId,
      jobId,
      status: "STORING",
      message: "Upload stored; hashing queued",
      progress: 45,
      at: new Date().toISOString(),
    });

    if (uploaderId) {
      await writeAudit({
        userId: uploaderId,
        action: "UPLOAD",
        entityType: "StorageObject",
        entityId: storageObject.id,
        metadata: { mimeType: validation.detectedMime, byteSize: put.byteSize },
      });
    }

    // Never return credentials or filesystem absolute paths
    return reply.code(201).send({
      storageObjectId: storageObject.id,
      storageKey: storageObject.storageKey,
      uri: storageObject.uri,
      mimeType: storageObject.mimeType,
      byteSize: storageObject.byteSize,
      originalFilename: storageObject.originalFilename,
      jobId,
    });
  });
};
