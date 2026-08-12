/**
 * EIP-712 typed data builders for AFTERIMAGE registries.
 */

import type { Address, Hex } from "viem";

export const AFTERIMAGE_EIP712_NAME = "AFTERIMAGE";
export const AFTERIMAGE_EIP712_VERSION = "1";

export type DomainParams = {
  chainId: number;
  verifyingContract: Address;
  name?: string;
  version?: string;
};

export function buildDomain(params: DomainParams) {
  return {
    name: params.name ?? AFTERIMAGE_EIP712_NAME,
    version: params.version ?? AFTERIMAGE_EIP712_VERSION,
    chainId: params.chainId,
    verifyingContract: params.verifyingContract,
  } as const;
}

/** Event creation typed data. */
export const EVENT_CREATION_TYPES = {
  EventCreation: [
    { name: "afterimageId", type: "bytes32" },
    { name: "parentEventId", type: "bytes32" },
    { name: "eventType", type: "uint8" },
    { name: "contentHash", type: "bytes32" },
    { name: "metadataHash", type: "bytes32" },
    { name: "locationCommitment", type: "bytes32" },
    { name: "timestamp", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type EventCreationMessage = {
  afterimageId: Hex;
  parentEventId: Hex;
  eventType: number;
  contentHash: Hex;
  metadataHash: Hex;
  locationCommitment: Hex;
  timestamp: bigint;
  nonce: bigint;
  deadline: bigint;
};

export function buildEventCreationTypedData(
  domain: DomainParams,
  message: EventCreationMessage,
) {
  return {
    domain: buildDomain(domain),
    types: EVENT_CREATION_TYPES,
    primaryType: "EventCreation" as const,
    message,
  };
}

/** Witness confirmation typed data. */
export const WITNESS_CONFIRMATION_TYPES = {
  WitnessConfirmation: [
    { name: "eventId", type: "bytes32" },
    { name: "contentHash", type: "bytes32" },
    { name: "witness", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type WitnessConfirmationMessage = {
  eventId: Hex;
  contentHash: Hex;
  witness: Address;
  nonce: bigint;
  deadline: bigint;
};

export function buildWitnessConfirmationTypedData(
  domain: DomainParams,
  message: WitnessConfirmationMessage,
) {
  return {
    domain: buildDomain(domain),
    types: WITNESS_CONFIRMATION_TYPES,
    primaryType: "WitnessConfirmation" as const,
    message,
  };
}

/** Dispute creation typed data. */
export const DISPUTE_TYPES = {
  Dispute: [
    { name: "afterimageId", type: "bytes32" },
    { name: "eventId", type: "bytes32" },
    { name: "reasonHash", type: "bytes32" },
    { name: "claimant", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type DisputeMessage = {
  afterimageId: Hex;
  eventId: Hex;
  reasonHash: Hex;
  claimant: Address;
  nonce: bigint;
  deadline: bigint;
};

export function buildDisputeTypedData(domain: DomainParams, message: DisputeMessage) {
  return {
    domain: buildDomain(domain),
    types: DISPUTE_TYPES,
    primaryType: "Dispute" as const,
    message,
  };
}

/** Ownership transfer typed data. */
export const OWNERSHIP_TRANSFER_TYPES = {
  OwnershipTransfer: [
    { name: "afterimageId", type: "bytes32" },
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "metadataHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

export type OwnershipTransferMessage = {
  afterimageId: Hex;
  from: Address;
  to: Address;
  metadataHash: Hex;
  nonce: bigint;
  deadline: bigint;
};

export function buildOwnershipTransferTypedData(
  domain: DomainParams,
  message: OwnershipTransferMessage,
) {
  return {
    domain: buildDomain(domain),
    types: OWNERSHIP_TRANSFER_TYPES,
    primaryType: "OwnershipTransfer" as const,
    message,
  };
}
