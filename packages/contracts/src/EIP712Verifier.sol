// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title EIP712Verifier
 * @notice Shared EIP-712 domain + typed digest helpers for AFTERIMAGE registries.
 * @dev Domain binds name, version, chainId, and verifyingContract (this).
 */
abstract contract EIP712Verifier is EIP712 {
    using ECDSA for bytes32;

    bytes32 public constant WITNESS_CONFIRMATION_TYPEHASH = keccak256(
        "WitnessConfirmation(bytes32 eventId,bytes32 contentHash,address witness,uint256 nonce,uint256 deadline)"
    );

    bytes32 public constant EVENT_CREATION_TYPEHASH = keccak256(
        "EventCreation(bytes32 afterimageId,bytes32 parentEventId,uint8 eventType,bytes32 contentHash,bytes32 metadataHash,bytes32 locationCommitment,uint256 timestamp,uint256 nonce,uint256 deadline)"
    );

    bytes32 public constant DISPUTE_TYPEHASH = keccak256(
        "Dispute(bytes32 afterimageId,bytes32 eventId,bytes32 reasonHash,address claimant,uint256 nonce,uint256 deadline)"
    );

    bytes32 public constant OWNERSHIP_TRANSFER_TYPEHASH = keccak256(
        "OwnershipTransfer(bytes32 afterimageId,address from,address to,bytes32 metadataHash,uint256 nonce,uint256 deadline)"
    );

    /// @dev Per-account nonce for replay protection.
    mapping(address => uint256) public nonces;

    error SignatureExpired();
    error InvalidSigner();
    error InvalidNonce();

    constructor(string memory name, string memory version) EIP712(name, version) {}

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function hashWitnessConfirmation(
        bytes32 eventId,
        bytes32 contentHash,
        address witness,
        uint256 nonce,
        uint256 deadline
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(WITNESS_CONFIRMATION_TYPEHASH, eventId, contentHash, witness, nonce, deadline)
        );
    }

    function hashEventCreation(
        bytes32 afterimageId,
        bytes32 parentEventId,
        uint8 eventType,
        bytes32 contentHash,
        bytes32 metadataHash,
        bytes32 locationCommitment,
        uint256 timestamp,
        uint256 nonce,
        uint256 deadline
    ) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                EVENT_CREATION_TYPEHASH,
                afterimageId,
                parentEventId,
                eventType,
                contentHash,
                metadataHash,
                locationCommitment,
                timestamp,
                nonce,
                deadline
            )
        );
    }

    function hashDispute(
        bytes32 afterimageId,
        bytes32 eventId,
        bytes32 reasonHash,
        address claimant,
        uint256 nonce,
        uint256 deadline
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(DISPUTE_TYPEHASH, afterimageId, eventId, reasonHash, claimant, nonce, deadline));
    }

    function hashOwnershipTransfer(
        bytes32 afterimageId,
        address from,
        address to,
        bytes32 metadataHash,
        uint256 nonce,
        uint256 deadline
    ) public pure returns (bytes32) {
        return
            keccak256(abi.encode(OWNERSHIP_TRANSFER_TYPEHASH, afterimageId, from, to, metadataHash, nonce, deadline));
    }

    /**
     * @notice Recover signer of a struct hash under this contract's EIP-712 domain.
     */
    function recoverSigner(bytes32 structHash, bytes calldata signature) public view returns (address) {
        bytes32 digest = _hashTypedDataV4(structHash);
        return ECDSA.recover(digest, signature);
    }

    function _requireValidDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) revert SignatureExpired();
    }

    function _useNonce(address owner, uint256 nonce) internal {
        if (nonces[owner] != nonce) revert InvalidNonce();
        unchecked {
            nonces[owner] = nonce + 1;
        }
    }

    function _verifyAndConsume(
        address expectedSigner,
        bytes32 structHash,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) internal {
        _requireValidDeadline(deadline);
        _useNonce(expectedSigner, nonce);
        address recovered = recoverSigner(structHash, signature);
        if (recovered != expectedSigner) revert InvalidSigner();
    }
}
