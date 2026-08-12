// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title DisputeRegistry
 * @notice Dispute lifecycle over afterimages/events. Claims are never deleted.
 */
contract DisputeRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    enum State {
        OPEN,
        CONTESTED,
        RESOLVED,
        WITHDRAWN
    }

    struct Dispute {
        bytes32 disputeId;
        bytes32 afterimageId;
        bytes32 eventId;
        address claimant;
        bytes32 reasonHash;
        State state;
        uint64 createdAt;
        uint64 resolvedAt;
        bytes32 resolutionHash;
        bool exists;
    }

    struct DisputeEvidence {
        bytes32 evidenceHash;
        address submitter;
        uint64 submittedAt;
    }

    mapping(bytes32 => Dispute) private _disputes;
    mapping(bytes32 => DisputeEvidence[]) private _disputeEvidence;
    mapping(bytes32 => bytes32[]) private _disputesByAfterimage;
    mapping(address => bytes32[]) private _disputesByClaimant;

    uint256 private _idCounter;

    event DisputeCreated(
        bytes32 indexed disputeId, bytes32 indexed afterimageId, bytes32 indexed eventId, address claimant
    );
    event DisputeEvidenceSubmitted(bytes32 indexed disputeId, bytes32 evidenceHash, address indexed submitter);
    event DisputeWithdrawn(bytes32 indexed disputeId, address indexed claimant);
    event DisputeContested(bytes32 indexed disputeId);
    event DisputeResolved(bytes32 indexed disputeId, bytes32 resolutionHash, bool favorClaimant);

    error DisputeNotFound(bytes32 disputeId);
    error DisputeAlreadyExists(bytes32 disputeId);
    error NotClaimant(bytes32 disputeId, address caller);
    error InvalidReasonHash();
    error InvalidAfterimageId();
    error TerminalDispute(bytes32 disputeId, State state);

    constructor(address admin) {
        require(admin != address(0), "invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(RESOLVER_ROLE, admin);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function createDispute(bytes32 afterimageId, bytes32 eventId, bytes32 reasonHash)
        external
        whenNotPaused
        nonReentrant
        returns (bytes32 disputeId)
    {
        if (afterimageId == bytes32(0)) revert InvalidAfterimageId();
        if (reasonHash == bytes32(0)) revert InvalidReasonHash();

        unchecked {
            ++_idCounter;
        }
        disputeId = keccak256(abi.encodePacked(msg.sender, afterimageId, eventId, reasonHash, _idCounter));

        if (_disputes[disputeId].exists) revert DisputeAlreadyExists(disputeId);

        Dispute storage d = _disputes[disputeId];
        d.disputeId = disputeId;
        d.afterimageId = afterimageId;
        d.eventId = eventId;
        d.claimant = msg.sender;
        d.reasonHash = reasonHash;
        d.state = State.OPEN;
        d.createdAt = uint64(block.timestamp);
        d.resolvedAt = 0;
        d.resolutionHash = bytes32(0);
        d.exists = true;

        _disputesByAfterimage[afterimageId].push(disputeId);
        _disputesByClaimant[msg.sender].push(disputeId);

        emit DisputeCreated(disputeId, afterimageId, eventId, msg.sender);
    }

    function submitEvidence(bytes32 disputeId, bytes32 evidenceHash) external whenNotPaused nonReentrant {
        Dispute storage d = _requireActive(disputeId);
        if (evidenceHash == bytes32(0)) revert InvalidReasonHash();

        _disputeEvidence[disputeId].push(
            DisputeEvidence({evidenceHash: evidenceHash, submitter: msg.sender, submittedAt: uint64(block.timestamp)})
        );

        if (d.state == State.OPEN && msg.sender != d.claimant) {
            d.state = State.CONTESTED;
            emit DisputeContested(disputeId);
        }

        emit DisputeEvidenceSubmitted(disputeId, evidenceHash, msg.sender);
    }

    function withdrawDispute(bytes32 disputeId) external whenNotPaused nonReentrant {
        Dispute storage d = _requireActive(disputeId);
        if (d.claimant != msg.sender) revert NotClaimant(disputeId, msg.sender);

        d.state = State.WITHDRAWN;
        // Never delete the claim — state transition only.
        emit DisputeWithdrawn(disputeId, msg.sender);
    }

    function resolveDispute(bytes32 disputeId, bytes32 resolutionHash, bool favorClaimant)
        external
        onlyRole(RESOLVER_ROLE)
        whenNotPaused
        nonReentrant
    {
        Dispute storage d = _requireActive(disputeId);
        if (resolutionHash == bytes32(0)) revert InvalidReasonHash();

        d.state = State.RESOLVED;
        d.resolvedAt = uint64(block.timestamp);
        d.resolutionHash = resolutionHash;

        emit DisputeResolved(disputeId, resolutionHash, favorClaimant);
    }

    function getDispute(bytes32 disputeId) external view returns (Dispute memory) {
        Dispute memory d = _disputes[disputeId];
        if (!d.exists) revert DisputeNotFound(disputeId);
        return d;
    }

    function getDisputeEvidence(bytes32 disputeId) external view returns (DisputeEvidence[] memory) {
        if (!_disputes[disputeId].exists) revert DisputeNotFound(disputeId);
        return _disputeEvidence[disputeId];
    }

    function getDisputesByAfterimage(bytes32 afterimageId) external view returns (bytes32[] memory) {
        return _disputesByAfterimage[afterimageId];
    }

    function _requireActive(bytes32 disputeId) internal view returns (Dispute storage d) {
        d = _disputes[disputeId];
        if (!d.exists) revert DisputeNotFound(disputeId);
        if (d.state == State.RESOLVED || d.state == State.WITHDRAWN) {
            revert TerminalDispute(disputeId, d.state);
        }
    }
}
