// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712Verifier} from "./EIP712Verifier.sol";
import {AfterimageRegistry} from "./AfterimageRegistry.sol";

/**
 * @title OwnershipRegistry
 * @notice Tracks afterimage ownership transfer history; optionally syncs AfterimageRegistry.
 */
contract OwnershipRegistry is AccessControl, ReentrancyGuard, Pausable, EIP712Verifier {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    struct TransferRecord {
        bytes32 transferId;
        bytes32 afterimageId;
        address from;
        address to;
        uint64 transferredAt;
        bytes32 metadataHash;
        bool exists;
    }

    AfterimageRegistry public afterimageRegistry;

    mapping(bytes32 => TransferRecord) private _transfers;
    mapping(bytes32 => bytes32[]) private _historyByAfterimage;
    mapping(bytes32 => address) private _currentOwner;

    uint256 private _idCounter;

    event OwnershipTransferRecorded(
        bytes32 indexed transferId,
        bytes32 indexed afterimageId,
        address indexed from,
        address to,
        bytes32 metadataHash
    );
    event AfterimageRegistryUpdated(address indexed previous, address indexed current);

    error TransferNotFound(bytes32 transferId);
    error InvalidAddress();
    error InvalidAfterimageId();
    error NotCurrentOwner(bytes32 afterimageId, address caller);
    error SameOwner();

    constructor(address admin, address afterimageRegistry_) EIP712Verifier("AFTERIMAGE", "1") {
        require(admin != address(0), "invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        if (afterimageRegistry_ != address(0)) {
            afterimageRegistry = AfterimageRegistry(afterimageRegistry_);
        }
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function setAfterimageRegistry(address registry) external onlyRole(ADMIN_ROLE) {
        address previous = address(afterimageRegistry);
        afterimageRegistry = AfterimageRegistry(registry);
        emit AfterimageRegistryUpdated(previous, registry);
    }

    /**
     * @notice Record an ownership transfer initiated by the current owner (msg.sender).
     */
    function recordTransfer(bytes32 afterimageId, address to, bytes32 metadataHash)
        external
        whenNotPaused
        nonReentrant
        returns (bytes32 transferId)
    {
        return _record(afterimageId, msg.sender, to, metadataHash);
    }

    /**
     * @notice Record transfer authorized by EIP-712 signature from current owner.
     */
    function recordTransferWithSignature(
        bytes32 afterimageId,
        address from,
        address to,
        bytes32 metadataHash,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused nonReentrant returns (bytes32 transferId) {
        bytes32 structHash = hashOwnershipTransfer(afterimageId, from, to, metadataHash, nonce, deadline);
        _verifyAndConsume(from, structHash, nonce, deadline, signature);
        return _record(afterimageId, from, to, metadataHash);
    }

    /**
     * @notice Bootstrap first owner when no history exists yet.
     */
    function initializeOwnership(bytes32 afterimageId, address owner)
        external
        onlyRole(OPERATOR_ROLE)
        whenNotPaused
    {
        if (afterimageId == bytes32(0)) revert InvalidAfterimageId();
        if (owner == address(0)) revert InvalidAddress();
        if (_currentOwner[afterimageId] != address(0)) revert SameOwner();
        _currentOwner[afterimageId] = owner;
    }

    function getTransfer(bytes32 transferId) external view returns (TransferRecord memory) {
        TransferRecord memory t = _transfers[transferId];
        if (!t.exists) revert TransferNotFound(transferId);
        return t;
    }

    function getOwnershipHistory(bytes32 afterimageId) external view returns (bytes32[] memory) {
        return _historyByAfterimage[afterimageId];
    }

    function currentOwner(bytes32 afterimageId) external view returns (address) {
        return _currentOwner[afterimageId];
    }

    function _record(bytes32 afterimageId, address from, address to, bytes32 metadataHash)
        internal
        returns (bytes32 transferId)
    {
        if (afterimageId == bytes32(0)) revert InvalidAfterimageId();
        if (to == address(0)) revert InvalidAddress();
        if (from == to) revert SameOwner();

        address tracked = _currentOwner[afterimageId];
        if (tracked != address(0) && tracked != from) {
            revert NotCurrentOwner(afterimageId, from);
        }

        unchecked {
            ++_idCounter;
        }
        transferId = keccak256(abi.encodePacked(afterimageId, from, to, metadataHash, _idCounter, block.timestamp));

        TransferRecord storage t = _transfers[transferId];
        t.transferId = transferId;
        t.afterimageId = afterimageId;
        t.from = from;
        t.to = to;
        t.transferredAt = uint64(block.timestamp);
        t.metadataHash = metadataHash;
        t.exists = true;

        _historyByAfterimage[afterimageId].push(transferId);
        _currentOwner[afterimageId] = to;

        emit OwnershipTransferRecorded(transferId, afterimageId, from, to, metadataHash);
    }
}
