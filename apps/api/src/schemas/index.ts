import { z } from "zod";

export const ethAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address");

export const hexBytes32 = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid bytes32")
  .optional();

export const createAfterimageSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(["PLACE", "OBJECT", "ARTWORK", "EVENT", "PRODUCT", "BUILDING", "RESEARCH", "OTHER"]),
  category: z
    .enum(["PLACES", "OBJECTS", "ART", "EVENTS", "PRODUCTS", "SCIENCE", "ARCHITECTURE", "OTHER"])
    .optional()
    .default("OTHER"),
  description: z.string().max(10_000).optional().default(""),
  firstObserved: z.string().datetime().or(z.string().min(4)),
  creatorAddress: ethAddress,
  visibility: z.enum(["PUBLIC", "APPROXIMATE", "PRIVATE"]).optional().default("APPROXIMATE"),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  metadataHash: hexBytes32,
});

export const listAfterimagesSchema = z.object({
  q: z.string().optional(),
  type: z
    .enum(["PLACE", "OBJECT", "ARTWORK", "EVENT", "PRODUCT", "BUILDING", "RESEARCH", "OTHER"])
    .optional(),
  category: z
    .enum(["PLACES", "OBJECTS", "ART", "EVENTS", "PRODUCTS", "SCIENCE", "ARCHITECTURE", "OTHER"])
    .optional(),
  status: z
    .enum(["ACTIVE", "CHANGING", "LAST_SEEN", "GONE", "ARCHIVED", "CONTESTED"])
    .optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  yearFrom: z.coerce.number().int().optional(),
  yearTo: z.coerce.number().int().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

export const createEventSchema = z.object({
  eventType: z.enum([
    "CREATED",
    "DISCOVERED",
    "OBSERVED",
    "PHOTOGRAPHED",
    "MODIFIED",
    "MOVED",
    "SOLD",
    "RESTORED",
    "RENOVATED",
    "DAMAGED",
    "OWNERSHIP_CHANGED",
    "LAST_SEEN",
    "DESTROYED",
    "ARCHIVED",
    "CUSTOM",
  ]),
  title: z.string().max(200).optional(),
  description: z.string().max(10_000).optional().default(""),
  occurredAt: z.string().min(4),
  parentEventId: z.string().cuid().optional().nullable(),
  creatorAddress: ethAddress,
  contentHash: hexBytes32,
  metadataHash: hexBytes32,
  locationCommitment: hexBytes32,
});

export const createEvidenceSchema = z.object({
  type: z.enum(["PHOTO", "VIDEO", "AUDIO", "DOCUMENT", "SENSOR", "WITNESS", "SIGNATURE", "OTHER"]),
  title: z.string().max(200).optional(),
  description: z.string().max(5_000).optional().default(""),
  creatorAddress: ethAddress,
  visibility: z.enum(["PUBLIC", "APPROXIMATE", "PRIVATE"]).optional().default("PUBLIC"),
  storageObjectId: z.string().cuid().optional(),
  contentHash: hexBytes32,
  metadataHash: hexBytes32,
});

export const createWitnessSchema = z.object({
  witnessAddress: ethAddress,
  statement: z.string().max(5_000).optional().default(""),
  signature: z.string().optional(),
  nonce: z.string().optional(),
  deadline: z.string().datetime().optional(),
  contentHash: hexBytes32,
});

export const createDisputeSchema = z.object({
  claimantAddress: ethAddress,
  reason: z.string().min(1).max(10_000),
  reasonHash: hexBytes32,
  evidenceIds: z.array(z.string().cuid()).optional().default([]),
});

export const verifySchema = z.object({
  contentHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  afterimageId: z.string().optional(),
  evidenceId: z.string().optional(),
  metadataHash: hexBytes32,
});

export const aiStorySchema = z.object({
  afterimageId: z.string().cuid(),
  question: z.string().min(1).max(2_000).optional().default("Tell me the complete history."),
  userAddress: ethAddress.optional(),
  conversationId: z.string().cuid().optional(),
});

export const uploadMetaSchema = z.object({
  afterimageId: z.string().cuid().optional(),
  uploaderAddress: ethAddress.optional(),
});
