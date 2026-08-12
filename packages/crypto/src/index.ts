/**
 * @afterimage/crypto — content hashing, canonical metadata, EIP-712, signatures.
 */

export { hashContent, hashContentString, normalizeHash, type BytesLike } from "./hash.js";

export {
  canonicalize,
  canonicalizeJson,
  hashMetadata,
  type JsonObject,
  type JsonPrimitive,
  type JsonValue,
} from "./canonical.js";

export {
  NonceManager,
  isDeadlineValid,
  defaultDeadline,
  type Address as NonceAddress,
} from "./nonce.js";

export {
  AFTERIMAGE_EIP712_NAME,
  AFTERIMAGE_EIP712_VERSION,
  buildDomain,
  EVENT_CREATION_TYPES,
  WITNESS_CONFIRMATION_TYPES,
  DISPUTE_TYPES,
  OWNERSHIP_TRANSFER_TYPES,
  buildEventCreationTypedData,
  buildWitnessConfirmationTypedData,
  buildDisputeTypedData,
  buildOwnershipTransferTypedData,
  type DomainParams,
  type EventCreationMessage,
  type WitnessConfirmationMessage,
  type DisputeMessage,
  type OwnershipTransferMessage,
} from "./eip712.js";

export {
  verifyTypedSignature,
  recoverTypedSigner,
  hashTypedPayload,
  verifyWitnessConfirmation,
  verifyEventCreation,
  verifyDispute,
  verifyOwnershipTransfer,
} from "./verify.js";
