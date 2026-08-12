// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AfterimageRegistry
 * @notice Core registry for temporal afterimage identities and lifecycle status.
 */
contract AfterimageRegistry is AccessControl, ReentrancyGuard, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    enum Status {
        ACTIVE,
        CHANGING,
        LAST_SEEN,
        GONE,
        ARCHIVED,
        CONTESTED
    }

    struct Afterimage {
        bytes32 afterimageId;
        address creator;
        uint64 createdAt;
        uint64 firstObserved;
        uint64 lastObserved;
        Status status;
        bytes32 metadataHash;
        bytes32 currentEvent;
        address owner;
        bool exists;
    }

    mapping(bytes32 => Afterimage) private _afterimages;
    mapping(address => bytes32[]) private _ownedAfterimages;

    uint256 private _idCounter;

    event AfterimageCreated(
        bytes32 indexed afterimageId, address indexed creator, address indexed owner, bytes32 metadataHash
    );
    event MetadataUpdated(bytes32 indexed afterimageId, bytes32 metadataHash);
    event ObservationRecorded(bytes32 indexed afterimageId, bytes32 indexed eventId, uint64 observedAt);
    event AfterimageMarkedLastSeen(bytes32 indexed afterimageId, uint64 timestamp);
    event AfterimageMarkedGone(bytes32 indexed afterimageId, uint64 timestamp);
    event AfterimageArchived(bytes32 indexed afterimageId, uint64 timestamp);
    event AfterimageStatusChanged(bytes32 indexed afterimageId, Status previous, Status current);
    event OwnershipTransferred(bytes32 indexed afterimageId, address indexed previousOwner, address indexed newOwner);

    error AfterimageNotFound(bytes32 afterimageId);
    error AfterimageAlreadyExists(bytes32 afterimageId);
    error NotAfterimageOwner(bytes32 afterimageId, address caller);
    error InvalidAddress();
    error InvalidMetadataHash();
    error InvalidStatusTransition(Status from, Status to);
    error AfterimageTerminal(bytes32 afterimageId, Status status);

    constructor(address admin) {
        if (admin == address(0)) revert InvalidAddress();
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
     * @notice Create a new afterimage owned by the caller.
     */
    function createAfterimage(bytes32 metadataHash, uint64 firstObserved)
        external
        whenNotPaused
        nonReentrant
        returns (bytes32 afterimageId)
    {
        if (metadataHash == bytes32(0)) revert InvalidMetadataHash();

        unchecked {
            ++_idCounter;
        }
        afterimageId = keccak256(abi.encodePacked(msg.sender, block.chainid, _idCounter, metadataHash, block.timestamp));

        if (_afterimages[afterimageId].exists) revert AfterimageAlreadyExists(afterimageId);

        uint64 nowTs = uint64(block.timestamp);
        uint64 first = firstObserved == 0 ? nowTs : firstObserved;

        Afterimage storage a = _afterimages[afterimageId];
        a.afterimageId = afterimageId;
        a.creator = msg.sender;
        a.createdAt = nowTs;
        a.firstObserved = first;
        a.lastObserved = first;
        a.status = Status.ACTIVE;
        a.metadataHash = metadataHash;
        a.currentEvent = bytes32(0);
        a.owner = msg.sender;
        a.exists = true;

        _ownedAfterimages[msg.sender].push(afterimageId);

        emit AfterimageCreated(afterimageId, msg.sender, msg.sender, metadataHash);
    }

    function updateMetadata(bytes32 afterimageId, bytes32 metadataHash)
        external
        whenNotPaused
        nonReentrant
    {
        Afterimage storage a = _requireMutable(afterimageId);
        _requireOwner(a, msg.sender);
        if (metadataHash == bytes32(0)) revert InvalidMetadataHash();

        a.metadataHash = metadataHash;
        if (a.status == Status.ACTIVE) {
            Status prev = a.status;
            a.status = Status.CHANGING;
            emit AfterimageStatusChanged(afterimageId, prev, Status.CHANGING);
        }
        emit MetadataUpdated(afterimageId, metadataHash);
    }

    function recordObservation(bytes32 afterimageId, bytes32 eventId, uint64 observedAt)
        external
        whenNotPaused
        nonReentrant
    {
        Afterimage storage a = _requireMutable(afterimageId);
        if (!hasRole(OPERATOR_ROLE, msg.sender) && a.owner != msg.sender) {
            revert NotAfterimageOwner(afterimageId, msg.sender);
        }

        uint64 ts = observedAt == 0 ? uint64(block.timestamp) : observedAt;
        if (ts > a.lastObserved) {
            a.lastObserved = ts;
        }
        a.currentEvent = eventId;

        if (a.status == Status.LAST_SEEN) {
            Status prev = a.status;
            a.status = Status.ACTIVE;
            emit AfterimageStatusChanged(afterimageId, prev, Status.ACTIVE);
        }

        emit ObservationRecorded(afterimageId, eventId, ts);
    }

    function markLastSeen(bytes32 afterimageId) external whenNotPaused nonReentrant {
        Afterimage storage a = _requireMutable(afterimageId);
        _requireOwnerOrOperator(a, msg.sender);

        Status prev = a.status;
        a.status = Status.LAST_SEEN;
        a.lastObserved = uint64(block.timestamp);

        emit AfterimageStatusChanged(afterimageId, prev, Status.LAST_SEEN);
        emit AfterimageMarkedLastSeen(afterimageId, uint64(block.timestamp));
    }

    function markGone(bytes32 afterimageId) external whenNotPaused nonReentrant {
        Afterimage storage a = _requireMutable(afterimageId);
        _requireOwnerOrOperator(a, msg.sender);

        Status prev = a.status;
        a.status = Status.GONE;

        emit AfterimageStatusChanged(afterimageId, prev, Status.GONE);
        emit AfterimageMarkedGone(afterimageId, uint64(block.timestamp));
    }

    function archiveAfterimage(bytes32 afterimageId) external whenNotPaused nonReentrant {
        Afterimage storage a = _requireExisting(afterimageId);
        _requireOwnerOrOperator(a, msg.sender);
        if (a.status == Status.ARCHIVED) revert InvalidStatusTransition(a.status, Status.ARCHIVED);

        Status prev = a.status;
        a.status = Status.ARCHIVED;

        emit AfterimageStatusChanged(afterimageId, prev, Status.ARCHIVED);
        emit AfterimageArchived(afterimageId, uint64(block.timestamp));
    }

    /**
     * @notice Transfer afterimage ownership. Updates ownership index.
     */
    function transferOwnership(bytes32 afterimageId, address newOwner)
        external
        whenNotPaused
        nonReentrant
    {
        if (newOwner == address(0)) revert InvalidAddress();
        Afterimage storage a = _requireMutable(afterimageId);
        _requireOwner(a, msg.sender);
        if (newOwner == a.owner) revert InvalidAddress();

        address previous = a.owner;
        a.owner = newOwner;
        _ownedAfterimages[newOwner].push(afterimageId);

        emit OwnershipTransferred(afterimageId, previous, newOwner);
    }

    /**
     * @notice Mark as contested (operator/admin). Does not delete history.
     */
    function markContested(bytes32 afterimageId) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        Afterimage storage a = _requireExisting(afterimageId);
        if (a.status == Status.ARCHIVED || a.status == Status.GONE) {
            revert AfterimageTerminal(afterimageId, a.status);
        }
        Status prev = a.status;
        a.status = Status.CONTESTED;
        emit AfterimageStatusChanged(afterimageId, prev, Status.CONTESTED);
    }

    function getAfterimage(bytes32 afterimageId) external view returns (Afterimage memory) {
        Afterimage memory a = _afterimages[afterimageId];
        if (!a.exists) revert AfterimageNotFound(afterimageId);
        return a;
    }

    function afterimageExists(bytes32 afterimageId) external view returns (bool) {
        return _afterimages[afterimageId].exists;
    }

    function ownedAfterimages(address owner) external view returns (bytes32[] memory) {
        return _ownedAfterimages[owner];
    }

    function _requireExisting(bytes32 afterimageId) internal view returns (Afterimage storage a) {
        a = _afterimages[afterimageId];
        if (!a.exists) revert AfterimageNotFound(afterimageId);
    }

    function _requireMutable(bytes32 afterimageId) internal view returns (Afterimage storage a) {
        a = _requireExisting(afterimageId);
        if (a.status == Status.ARCHIVED || a.status == Status.GONE) {
            revert AfterimageTerminal(afterimageId, a.status);
        }
    }

    function _requireOwner(Afterimage storage a, address caller) internal view {
        if (a.owner != caller) revert NotAfterimageOwner(a.afterimageId, caller);
    }

    function _requireOwnerOrOperator(Afterimage storage a, address caller) internal view {
        if (a.owner != caller && !hasRole(OPERATOR_ROLE, caller)) {
            revert NotAfterimageOwner(a.afterimageId, caller);
        }
    }
}
