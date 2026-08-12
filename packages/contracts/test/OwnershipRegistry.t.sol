// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {OwnershipRegistry} from "../src/OwnershipRegistry.sol";
import {AfterimageRegistry} from "../src/AfterimageRegistry.sol";
import {EIP712Verifier} from "../src/EIP712Verifier.sol";
import {EvidenceRegistry} from "../src/EvidenceRegistry.sol";

contract OwnershipRegistryTest is Test {
    OwnershipRegistry internal ownership;
    AfterimageRegistry internal afterimages;

    address internal admin = makeAddr("admin");
    uint256 internal alicePk = 0xA11CE;
    address internal alice;
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    bytes32 internal afterimageId = keccak256("ai-own");
    bytes32 internal meta = keccak256("transfer-meta");

    function setUp() public {
        alice = vm.addr(alicePk);
        afterimages = new AfterimageRegistry(admin);
        ownership = new OwnershipRegistry(admin, address(afterimages));

        bytes32 operatorRole = ownership.OPERATOR_ROLE();
        vm.startPrank(admin);
        ownership.grantRole(operatorRole, admin);
        ownership.initializeOwnership(afterimageId, alice);
        vm.stopPrank();
    }

    function test_recordTransfer() public {
        vm.prank(alice);
        bytes32 transferId = ownership.recordTransfer(afterimageId, bob, meta);

        OwnershipRegistry.TransferRecord memory t = ownership.getTransfer(transferId);
        assertEq(t.from, alice);
        assertEq(t.to, bob);
        assertEq(ownership.currentOwner(afterimageId), bob);
        assertEq(ownership.getOwnershipHistory(afterimageId).length, 1);
    }

    function test_recordTransfer_notOwner() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(OwnershipRegistry.NotCurrentOwner.selector, afterimageId, bob));
        ownership.recordTransfer(afterimageId, carol, meta);
    }

    function test_chainOfTransfers() public {
        vm.prank(alice);
        ownership.recordTransfer(afterimageId, bob, meta);
        vm.prank(bob);
        ownership.recordTransfer(afterimageId, carol, keccak256("m2"));

        assertEq(ownership.currentOwner(afterimageId), carol);
        assertEq(ownership.getOwnershipHistory(afterimageId).length, 2);
    }

    function test_recordTransferWithSignature() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = ownership.hashOwnershipTransfer(afterimageId, alice, bob, meta, nonce, deadline);
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ownership.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Anyone can submit if signature is valid
        vm.prank(carol);
        bytes32 transferId =
            ownership.recordTransferWithSignature(afterimageId, alice, bob, meta, nonce, deadline, sig);

        assertEq(ownership.getTransfer(transferId).to, bob);
        assertEq(ownership.currentOwner(afterimageId), bob);
    }

    function test_signatureReplay() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = ownership.hashOwnershipTransfer(afterimageId, alice, bob, meta, 0, deadline);
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ownership.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        ownership.recordTransferWithSignature(afterimageId, alice, bob, meta, 0, deadline, sig);

        // Reset owner for second attempt simulation — still fails on nonce
        vm.prank(admin);
        // bob is current owner; replay of alice->bob with nonce 0 must fail
        vm.expectRevert(EIP712Verifier.InvalidNonce.selector);
        ownership.recordTransferWithSignature(afterimageId, alice, bob, meta, 0, deadline, sig);
    }

    function test_expiredSignature() public {
        uint256 deadline = block.timestamp + 10;
        bytes32 structHash = ownership.hashOwnershipTransfer(afterimageId, alice, bob, meta, 0, deadline);
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ownership.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        vm.warp(deadline + 1);
        vm.expectRevert(EIP712Verifier.SignatureExpired.selector);
        ownership.recordTransferWithSignature(afterimageId, alice, bob, meta, 0, deadline, sig);
    }

    function test_pause() public {
        vm.prank(admin);
        ownership.pause();
        vm.prank(alice);
        vm.expectRevert();
        ownership.recordTransfer(afterimageId, bob, meta);
    }
}

contract EvidenceRegistryTest is Test {
    EvidenceRegistry internal registry;
    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");

    function setUp() public {
        registry = new EvidenceRegistry(admin);
    }

    function test_registerEvidence() public {
        bytes32 aid = keccak256("ai");
        bytes32 eid = keccak256("ev");
        bytes32 content = keccak256("photo-bytes");
        bytes32 meta = keccak256("meta");
        bytes32 storageRef = keccak256("ipfs-cid-commitment");

        vm.prank(alice);
        bytes32 evidenceId = registry.registerEvidence(
            aid, eid, EvidenceRegistry.EvidenceType.PHOTO, content, meta, storageRef
        );

        EvidenceRegistry.Evidence memory e = registry.getEvidence(evidenceId);
        assertEq(e.submitter, alice);
        assertEq(e.afterimageId, aid);
        assertEq(e.eventId, eid);
        assertEq(e.contentHash, content);
        assertEq(registry.getEvidenceByAfterimage(aid).length, 1);
        assertEq(registry.getEvidenceByEvent(eid).length, 1);
    }

    function test_unauthorizedPause() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.pause();
    }
}
