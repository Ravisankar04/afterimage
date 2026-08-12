/**
 * AFTERIMAGE shared domain types.
 * Mirrors on-chain enums and registry records for off-chain clients.
 */

/** Hex-encoded bytes32 (0x-prefixed, 66 chars). */
export type Bytes32 = `0x${string}`;

/** Hex-encoded Ethereum address. */
export type Address = `0x${string}`;

/** Hex-encoded signature or arbitrary bytes. */
export type Hex = `0x${string}`;

/** Lifecycle status of an afterimage. */
export enum AfterimageStatus {
  ACTIVE = 0,
  CHANGING = 1,
  LAST_SEEN = 2,
  GONE = 3,
  ARCHIVED = 4,
  CONTESTED = 5,
}

/** Temporal event classification. */
export enum EventType {
  CREATED = 0,
  DISCOVERED = 1,
  OBSERVED = 2,
  PHOTOGRAPHED = 3,
  MODIFIED = 4,
  MOVED = 5,
  SOLD = 6,
  RESTORED = 7,
  RENOVATED = 8,
  DAMAGED = 9,
  OWNERSHIP_CHANGED = 10,
  LAST_SEEN = 11,
  DESTROYED = 12,
  ARCHIVED = 13,
  CUSTOM = 14,
}

/** Evidence payload kind. */
export enum EvidenceType {
  PHOTO = 0,
  DOCUMENT = 1,
  SENSOR = 2,
  ATTESTATION = 3,
  OTHER = 4,
}

/** Dispute lifecycle. */
export enum DisputeState {
  OPEN = 0,
  CONTESTED = 1,
  RESOLVED = 2,
  WITHDRAWN = 3,
}

/** On-chain afterimage record. */
export interface Afterimage {
  afterimageId: Bytes32;
  creator: Address;
  createdAt: bigint;
  firstObserved: bigint;
  lastObserved: bigint;
  status: AfterimageStatus;
  metadataHash: Bytes32;
  currentEvent: Bytes32;
  owner: Address;
}

/** On-chain temporal event record. */
export interface AfterimageEvent {
  eventId: Bytes32;
  afterimageId: Bytes32;
  parentEventId: Bytes32;
  creator: Address;
  eventType: EventType;
  contentHash: Bytes32;
  metadataHash: Bytes32;
  timestamp: bigint;
  locationCommitment: Bytes32;
}

/** Registered evidence artifact. */
export interface Evidence {
  evidenceId: Bytes32;
  afterimageId: Bytes32;
  eventId: Bytes32;
  submitter: Address;
  evidenceType: EvidenceType;
  contentHash: Bytes32;
  metadataHash: Bytes32;
  storageReference: Bytes32;
  submittedAt: bigint;
}

/** Witness confirmation of an event. */
export interface WitnessConfirmation {
  confirmationId: Bytes32;
  eventId: Bytes32;
  witness: Address;
  contentHash: Bytes32;
  confirmedAt: bigint;
  withdrawn: boolean;
}

/** Witness reputation aggregates. */
export interface WitnessReputation {
  confirmedEvents: bigint;
  disputedConfirmations: bigint;
  successfulCorroborations: bigint;
  withdrawnConfirmations: bigint;
}

/** Dispute claim over an afterimage or event. */
export interface Dispute {
  disputeId: Bytes32;
  afterimageId: Bytes32;
  eventId: Bytes32;
  claimant: Address;
  reasonHash: Bytes32;
  state: DisputeState;
  createdAt: bigint;
  resolvedAt: bigint;
  resolutionHash: Bytes32;
}

/** Ownership transfer history entry. */
export interface OwnershipTransfer {
  transferId: Bytes32;
  afterimageId: Bytes32;
  from: Address;
  to: Address;
  transferredAt: bigint;
  metadataHash: Bytes32;
}

/** Canonical metadata object before hashing (off-chain). */
export interface CanonicalMetadata {
  [key: string]: unknown;
}

/** Status name helpers for UI / APIs. */
export const AFTERIMAGE_STATUS_NAMES: Record<AfterimageStatus, string> = {
  [AfterimageStatus.ACTIVE]: "ACTIVE",
  [AfterimageStatus.CHANGING]: "CHANGING",
  [AfterimageStatus.LAST_SEEN]: "LAST_SEEN",
  [AfterimageStatus.GONE]: "GONE",
  [AfterimageStatus.ARCHIVED]: "ARCHIVED",
  [AfterimageStatus.CONTESTED]: "CONTESTED",
};

export const EVENT_TYPE_NAMES: Record<EventType, string> = {
  [EventType.CREATED]: "CREATED",
  [EventType.DISCOVERED]: "DISCOVERED",
  [EventType.OBSERVED]: "OBSERVED",
  [EventType.PHOTOGRAPHED]: "PHOTOGRAPHED",
  [EventType.MODIFIED]: "MODIFIED",
  [EventType.MOVED]: "MOVED",
  [EventType.SOLD]: "SOLD",
  [EventType.RESTORED]: "RESTORED",
  [EventType.RENOVATED]: "RENOVATED",
  [EventType.DAMAGED]: "DAMAGED",
  [EventType.OWNERSHIP_CHANGED]: "OWNERSHIP_CHANGED",
  [EventType.LAST_SEEN]: "LAST_SEEN",
  [EventType.DESTROYED]: "DESTROYED",
  [EventType.ARCHIVED]: "ARCHIVED",
  [EventType.CUSTOM]: "CUSTOM",
};

export const DISPUTE_STATE_NAMES: Record<DisputeState, string> = {
  [DisputeState.OPEN]: "OPEN",
  [DisputeState.CONTESTED]: "CONTESTED",
  [DisputeState.RESOLVED]: "RESOLVED",
  [DisputeState.WITHDRAWN]: "WITHDRAWN",
};
