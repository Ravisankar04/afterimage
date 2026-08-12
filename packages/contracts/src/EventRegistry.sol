// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title EventRegistry
 * @notice Temporal event graph linked to afterimages. Parent events must exist and cannot be self.
 */
contract EventRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum EventType {
        CREATED,
        DISCOVERED,
        OBSERVED,
        PHOTOGRAPHED,
        MODIFIED,
        MOVED,
        SOLD,
        RESTORED,
        RENOVATED,
        DAMAGED,
        OWNERSHIP_CHANGED,
        LAST_SEEN,
        DESTROYED,
        ARCHIVED,
        CUSTOM
    }

    struct EventRecord {
        bytes32 eventId;
        bytes32 afterimageId;
        bytes32 parentEventId;
        address creator;
        EventType eventType;
        bytes32 contentHash;
        bytes32 metadataHash;
        uint64 timestamp;
        bytes32 locationCommitment;
        bool exists;
    }

    mapping(bytes32 => EventRecord) private _events;
    mapping(bytes32 => bytes32[]) private _eventsByAfterimage;

    uint256 private _idCounter;

    event EventCreated(
        bytes32 indexed eventId,
        bytes32 indexed afterimageId,
        bytes32 parentEventId,
        address indexed creator,
        EventType eventType
    );

    error EventNotFound(bytes32 eventId);
    error EventAlreadyExists(bytes32 eventId);
    error ParentEventNotFound(bytes32 parentEventId);
    error SelfParentNotAllowed(bytes32 eventId);
    error InvalidAfterimageId();
    error InvalidContentHash();

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

    function createEvent(
        bytes32 afterimageId,
        bytes32 parentEventId,
        EventType eventType,
        bytes32 contentHash,
        bytes32 metadataHash,
        bytes32 locationCommitment,
        uint64 timestamp
    ) external whenNotPaused nonReentrant returns (bytes32 eventId) {
        if (afterimageId == bytes32(0)) revert InvalidAfterimageId();
        if (contentHash == bytes32(0)) revert InvalidContentHash();

        if (parentEventId != bytes32(0)) {
            if (!_events[parentEventId].exists) revert ParentEventNotFound(parentEventId);
        }

        unchecked {
            ++_idCounter;
        }
        eventId = keccak256(
            abi.encodePacked(msg.sender, afterimageId, parentEventId, contentHash, _idCounter, block.timestamp)
        );

        if (_events[eventId].exists) revert EventAlreadyExists(eventId);
        if (parentEventId == eventId) revert SelfParentNotAllowed(eventId);

        uint64 ts = timestamp == 0 ? uint64(block.timestamp) : timestamp;

        EventRecord storage e = _events[eventId];
        e.eventId = eventId;
        e.afterimageId = afterimageId;
        e.parentEventId = parentEventId;
        e.creator = msg.sender;
        e.eventType = eventType;
        e.contentHash = contentHash;
        e.metadataHash = metadataHash;
        e.timestamp = ts;
        e.locationCommitment = locationCommitment;
        e.exists = true;

        _eventsByAfterimage[afterimageId].push(eventId);

        emit EventCreated(eventId, afterimageId, parentEventId, msg.sender, eventType);
    }

    function getEvent(bytes32 eventId) external view returns (EventRecord memory) {
        EventRecord memory e = _events[eventId];
        if (!e.exists) revert EventNotFound(eventId);
        return e;
    }

    function getEventsByAfterimage(bytes32 afterimageId) external view returns (bytes32[] memory) {
        return _eventsByAfterimage[afterimageId];
    }

    function eventExists(bytes32 eventId) external view returns (bool) {
        return _events[eventId].exists;
    }
}
