// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712Verifier} from "./EIP712Verifier.sol";

/**
 * @title WitnessRegistry
 * @notice EIP-712 witness confirmations with reputation tracking.
 */
contract WitnessRegistry is AccessControl, ReentrancyGuard, Pausable, EIP712Verifier {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct Confirmation {
        bytes32 confirmationId;
        bytes32 eventId;
        address witness;
        bytes32 contentHash;
        uint64 confirmedAt;
        bool withdrawn;
        bool exists;
    }

    struct Reputation {
        uint64 confirmedEvents;
        uint64 disputedConfirmations;
        uint64 successfulCorroborations;
        uint64 withdrawnConfirmations;
    }

    mapping(bytes32 => Confirmation) private _confirmations;
    mapping(bytes32 => mapping(address => bool)) private _hasWitnessed;
    mapping(bytes32 => bytes32[]) private _confirmationsByEvent;
    mapping(address => Reputation) private _reputation;
    mapping(address => bytes32[]) private _confirmationsByWitness;

    uint256 private _idCounter;

    event EventConfirmed(
        bytes32 indexed confirmationId, bytes32 indexed eventId, address indexed witness, bytes32 contentHash
    );
    event ConfirmationWithdrawn(bytes32 indexed confirmationId, bytes32 indexed eventId, address indexed witness);
    event ReputationUpdated(address indexed witness, Reputation reputation);

    error DuplicateWitness(bytes32 eventId, address witness);
    error ConfirmationNotFound(bytes32 confirmationId);
    error NotConfirmationWitness(bytes32 confirmationId, address caller);
    error AlreadyWithdrawn(bytes32 confirmationId);
    error InvalidEventId();
    error InvalidContentHash();

    constructor(address admin) EIP712Verifier("AFTERIMAGE", "1") {
        require(admin != address(0), "invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @notice Confirm an event with an EIP-712 signature from `witness`.
     * @dev Prevents duplicate witness per event. Consumes nonce.
     */
    function confirmEvent(
        bytes32 eventId,
        bytes32 contentHash,
        address witness,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant returns (bytes32 confirmationId) {
        if (eventId == bytes32(0)) revert InvalidEventId();
        if (contentHash == bytes32(0)) revert InvalidContentHash();
        if (_hasWitnessed[eventId][witness]) revert DuplicateWitness(eventId, witness);

        bytes32 structHash = hashWitnessConfirmation(eventId, contentHash, witness, nonce, deadline);
        _verifyAndConsume(witness, structHash, nonce, deadline, signature);

        unchecked {
            ++_idCounter;
        }
        confirmationId = keccak256(abi.encodePacked(eventId, witness, contentHash, _idCounter));

        Confirmation storage c = _confirmations[confirmationId];
        c.confirmationId = confirmationId;
        c.eventId = eventId;
        c.witness = witness;
        c.contentHash = contentHash;
        c.confirmedAt = uint64(block.timestamp);
        c.withdrawn = false;
        c.exists = true;

        _hasWitnessed[eventId][witness] = true;
        _confirmationsByEvent[eventId].push(confirmationId);
        _confirmationsByWitness[witness].push(confirmationId);

        Reputation storage rep = _reputation[witness];
        unchecked {
            ++rep.confirmedEvents;
        }

        emit EventConfirmed(confirmationId, eventId, witness, contentHash);
        emit ReputationUpdated(witness, rep);
    }

    function withdrawConfirmation(bytes32 confirmationId) external whenNotPaused nonReentrant {
        Confirmation storage c = _confirmations[confirmationId];
        if (!c.exists) revert ConfirmationNotFound(confirmationId);
        if (c.witness != msg.sender) revert NotConfirmationWitness(confirmationId, msg.sender);
        if (c.withdrawn) revert AlreadyWithdrawn(confirmationId);

        c.withdrawn = true;
        _hasWitnessed[c.eventId][c.witness] = false;

        Reputation storage rep = _reputation[c.witness];
        unchecked {
            ++rep.withdrawnConfirmations;
            if (rep.confirmedEvents > 0) --rep.confirmedEvents;
        }

        emit ConfirmationWithdrawn(confirmationId, c.eventId, c.witness);
        emit ReputationUpdated(c.witness, rep);
    }

    /**
     * @notice Operator marks a confirmation as disputed (reputation penalty).
     */
    function markDisputed(bytes32 confirmationId) external onlyRole(OPERATOR_ROLE) {
        Confirmation storage c = _confirmations[confirmationId];
        if (!c.exists) revert ConfirmationNotFound(confirmationId);

        Reputation storage rep = _reputation[c.witness];
        unchecked {
            ++rep.disputedConfirmations;
        }
        emit ReputationUpdated(c.witness, rep);
    }

    /**
     * @notice Operator records successful corroboration.
     */
    function markCorroborated(bytes32 confirmationId) external onlyRole(OPERATOR_ROLE) {
        Confirmation storage c = _confirmations[confirmationId];
        if (!c.exists) revert ConfirmationNotFound(confirmationId);

        Reputation storage rep = _reputation[c.witness];
        unchecked {
            ++rep.successfulCorroborations;
        }
        emit ReputationUpdated(c.witness, rep);
    }

    function getConfirmation(bytes32 confirmationId) external view returns (Confirmation memory) {
        Confirmation memory c = _confirmations[confirmationId];
        if (!c.exists) revert ConfirmationNotFound(confirmationId);
        return c;
    }

    function getReputation(address witness) external view returns (Reputation memory) {
        return _reputation[witness];
    }

    function hasWitnessed(bytes32 eventId, address witness) external view returns (bool) {
        return _hasWitnessed[eventId][witness];
    }

    function getConfirmationsByEvent(bytes32 eventId) external view returns (bytes32[] memory) {
        return _confirmationsByEvent[eventId];
    }
}
