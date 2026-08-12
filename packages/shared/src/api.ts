/**
 * Off-chain API request/response shapes for AFTERIMAGE services.
 */

import type { Address, Bytes32, Hex } from "./types.js";
import type {
  Afterimage,
  AfterimageEvent,
  Dispute,
  Evidence,
  OwnershipTransfer,
  WitnessConfirmation,
  WitnessReputation,
} from "./types.js";
import type {
  AfterimageStatus,
  DisputeState,
  EventType,
  EvidenceType,
} from "./types.js";

export interface CreateAfterimageRequest {
  metadataHash: Bytes32;
  firstObserved?: number;
}

export interface CreateAfterimageResponse {
  afterimageId: Bytes32;
  txHash: Hex;
}

export interface RecordObservationRequest {
  afterimageId: Bytes32;
  eventId: Bytes32;
  observedAt?: number;
}

export interface CreateEventRequest {
  afterimageId: Bytes32;
  parentEventId: Bytes32;
  eventType: EventType;
  contentHash: Bytes32;
  metadataHash: Bytes32;
  locationCommitment: Bytes32;
  timestamp?: number;
}

export interface CreateEventResponse {
  eventId: Bytes32;
  txHash: Hex;
}

export interface RegisterEvidenceRequest {
  afterimageId: Bytes32;
  eventId: Bytes32;
  evidenceType: EvidenceType;
  contentHash: Bytes32;
  metadataHash: Bytes32;
  storageReference: Bytes32;
}

export interface RegisterEvidenceResponse {
  evidenceId: Bytes32;
  txHash: Hex;
}

export interface ConfirmEventRequest {
  eventId: Bytes32;
  contentHash: Bytes32;
  nonce: bigint;
  deadline: number;
  signature: Hex;
}

export interface ConfirmEventResponse {
  confirmationId: Bytes32;
  txHash: Hex;
}

export interface CreateDisputeRequest {
  afterimageId: Bytes32;
  eventId: Bytes32;
  reasonHash: Bytes32;
}

export interface CreateDisputeResponse {
  disputeId: Bytes32;
  txHash: Hex;
}

export interface ResolveDisputeRequest {
  disputeId: Bytes32;
  resolutionHash: Bytes32;
  favorClaimant: boolean;
}

export interface TransferOwnershipRequest {
  afterimageId: Bytes32;
  to: Address;
  metadataHash: Bytes32;
  nonce: bigint;
  deadline: number;
  signature: Hex;
}

export interface GetAfterimageResponse {
  afterimage: Afterimage;
}

export interface GetEventResponse {
  event: AfterimageEvent;
}

export interface ListEventsResponse {
  events: AfterimageEvent[];
}

export interface GetEvidenceResponse {
  evidence: Evidence;
}

export interface GetWitnessReputationResponse {
  reputation: WitnessReputation;
}

export interface ListConfirmationsResponse {
  confirmations: WitnessConfirmation[];
}

export interface GetDisputeResponse {
  dispute: Dispute;
}

export interface OwnershipHistoryResponse {
  transfers: OwnershipTransfer[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedQuery {
  cursor?: string;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  total?: number;
}

export interface AfterimageFilter {
  owner?: Address;
  creator?: Address;
  status?: AfterimageStatus;
  createdAfter?: number;
  createdBefore?: number;
}

export interface DisputeFilter {
  afterimageId?: Bytes32;
  claimant?: Address;
  state?: DisputeState;
}
