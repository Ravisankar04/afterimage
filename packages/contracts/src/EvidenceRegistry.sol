// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EvidenceRegistry
 * @notice Registers content-addressed evidence linked to afterimages and events.
 */
contract EvidenceRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum EvidenceType {
        PHOTO,
        DOCUMENT,
        SENSOR,
        ATTESTATION,
        OTHER
    }

    struct Evidence {
        bytes32 evidenceId;
        bytes32 afterimageId;
        bytes32 eventId;
        address submitter;
        EvidenceType evidenceType;
        bytes32 contentHash;
        bytes32 metadataHash;
        bytes32 storageReference;
        uint64 submittedAt;
        bool exists;
    }

    mapping(bytes32 => Evidence) private _evidence;
    mapping(bytes32 => bytes32[]) private _evidenceByAfterimage;
    mapping(bytes32 => bytes32[]) private _evidenceByEvent;

    uint256 private _idCounter;

    event EvidenceRegistered(
        bytes32 indexed evidenceId,
        bytes32 indexed afterimageId,
        bytes32 indexed eventId,
        address submitter,
        EvidenceType evidenceType,
        bytes32 contentHash
    );

    error EvidenceNotFound(bytes32 evidenceId);
    error EvidenceAlreadyExists(bytes32 evidenceId);
    error InvalidContentHash();
    error InvalidAfterimageId();

    constructor(address admin) {
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

    function registerEvidence(
        bytes32 afterimageId,
        bytes32 eventId,
        EvidenceType evidenceType,
        bytes32 contentHash,
        bytes32 metadataHash,
        bytes32 storageReference
    ) external whenNotPaused nonReentrant returns (bytes32 evidenceId) {
        if (afterimageId == bytes32(0)) revert InvalidAfterimageId();
        if (contentHash == bytes32(0)) revert InvalidContentHash();

        unchecked {
            ++_idCounter;
        }
        evidenceId = keccak256(
            abi.encodePacked(msg.sender, afterimageId, eventId, contentHash, storageReference, _idCounter)
        );

        if (_evidence[evidenceId].exists) revert EvidenceAlreadyExists(evidenceId);

        Evidence storage ev = _evidence[evidenceId];
        ev.evidenceId = evidenceId;
        ev.afterimageId = afterimageId;
        ev.eventId = eventId;
        ev.submitter = msg.sender;
        ev.evidenceType = evidenceType;
        ev.contentHash = contentHash;
        ev.metadataHash = metadataHash;
        ev.storageReference = storageReference;
        ev.submittedAt = uint64(block.timestamp);
        ev.exists = true;

        _evidenceByAfterimage[afterimageId].push(evidenceId);
        if (eventId != bytes32(0)) {
            _evidenceByEvent[eventId].push(evidenceId);
        }

        emit EvidenceRegistered(evidenceId, afterimageId, eventId, msg.sender, evidenceType, contentHash);
    }

    function getEvidence(bytes32 evidenceId) external view returns (Evidence memory) {
        Evidence memory ev = _evidence[evidenceId];
        if (!ev.exists) revert EvidenceNotFound(evidenceId);
        return ev;
    }

    function getEvidenceByAfterimage(bytes32 afterimageId) external view returns (bytes32[] memory) {
        return _evidenceByAfterimage[afterimageId];
    }

    function getEvidenceByEvent(bytes32 eventId) external view returns (bytes32[] memory) {
        return _evidenceByEvent[eventId];
    }
}
