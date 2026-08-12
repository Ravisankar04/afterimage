/**
 * EIP-712 signature verification helpers using viem.
 */

import {
  type Address,
  type Hex,
  type TypedDataDefinition,
  hashTypedData,
  recoverTypedDataAddress,
  verifyTypedData,
} from "viem";
import {
  buildDisputeTypedData,
  buildEventCreationTypedData,
  buildOwnershipTransferTypedData,
  buildWitnessConfirmationTypedData,
  type DisputeMessage,
  type DomainParams,
  type EventCreationMessage,
  type OwnershipTransferMessage,
  type WitnessConfirmationMessage,
} from "./eip712.js";

export async function verifyTypedSignature(
  typedData: TypedDataDefinition,
  signature: Hex,
  expectedSigner: Address,
): Promise<boolean> {
  return verifyTypedData({
    ...typedData,
    address: expectedSigner,
    signature,
  });
}

export async function recoverTypedSigner(
  typedData: TypedDataDefinition,
  signature: Hex,
): Promise<Address> {
  return recoverTypedDataAddress({
    ...typedData,
    signature,
  });
}

export function hashTypedPayload(typedData: TypedDataDefinition): Hex {
  return hashTypedData(typedData);
}

export async function verifyWitnessConfirmation(
  domain: DomainParams,
  message: WitnessConfirmationMessage,
  signature: Hex,
  expectedSigner?: Address,
): Promise<boolean> {
  const typedData = buildWitnessConfirmationTypedData(domain, message);
  const signer = expectedSigner ?? message.witness;
  return verifyTypedSignature(typedData, signature, signer);
}

export async function verifyEventCreation(
  domain: DomainParams,
  message: EventCreationMessage,
  signature: Hex,
  expectedSigner: Address,
): Promise<boolean> {
  const typedData = buildEventCreationTypedData(domain, message);
  return verifyTypedSignature(typedData, signature, expectedSigner);
}

export async function verifyDispute(
  domain: DomainParams,
  message: DisputeMessage,
  signature: Hex,
  expectedSigner?: Address,
): Promise<boolean> {
  const typedData = buildDisputeTypedData(domain, message);
  const signer = expectedSigner ?? message.claimant;
  return verifyTypedSignature(typedData, signature, signer);
}

export async function verifyOwnershipTransfer(
  domain: DomainParams,
  message: OwnershipTransferMessage,
  signature: Hex,
  expectedSigner?: Address,
): Promise<boolean> {
  const typedData = buildOwnershipTransferTypedData(domain, message);
  const signer = expectedSigner ?? message.from;
  return verifyTypedSignature(typedData, signature, signer);
}
