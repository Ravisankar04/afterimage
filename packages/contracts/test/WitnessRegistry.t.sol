// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {WitnessRegistry} from "../src/WitnessRegistry.sol";
import {EIP712Verifier} from "../src/EIP712Verifier.sol";

contract WitnessRegistryTest is Test {
    WitnessRegistry internal registry;

    address internal admin = makeAddr("admin");
    uint256 internal witnessPk = 0xA11CE;
    address internal witness;
    address internal other = makeAddr("other");

    bytes32 internal eventId = keccak256("event-1");
    bytes32 internal contentHash = keccak256("content");

    function setUp() public {
        witness = vm.addr(witnessPk);
        registry = new WitnessRegistry(admin);
    }

    function _signConfirmation(uint256 pk, bytes32 eid, bytes32 ch, address w, uint256 nonce, uint256 deadline)
        internal
        view
        returns (bytes memory)
    {
        bytes32 structHash = registry.hashWitnessConfirmation(eid, ch, w, nonce, deadline);
        bytes32 digest = _hashTyped(structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _hashTyped(bytes32 structHash) internal view returns (bytes32) {
        bytes32 domainSeparator = registry.DOMAIN_SEPARATOR();
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    function test_confirmEvent() public {
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signConfirmation(witnessPk, eventId, contentHash, witness, nonce, deadline);

        bytes32 confirmationId = registry.confirmEvent(eventId, contentHash, witness, nonce, deadline, sig);

        WitnessRegistry.Confirmation memory c = registry.getConfirmation(confirmationId);
        assertEq(c.eventId, eventId);
        assertEq(c.witness, witness);
        assertFalse(c.withdrawn);
        assertTrue(registry.hasWitnessed(eventId, witness));

        WitnessRegistry.Reputation memory rep = registry.getReputation(witness);
        assertEq(rep.confirmedEvents, 1);
    }

    function test_duplicateWitness() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig0 = _signConfirmation(witnessPk, eventId, contentHash, witness, 0, deadline);
        registry.confirmEvent(eventId, contentHash, witness, 0, deadline, sig0);

        bytes memory sig1 = _signConfirmation(witnessPk, eventId, contentHash, witness, 1, deadline);
        vm.expectRevert(abi.encodeWithSelector(WitnessRegistry.DuplicateWitness.selector, eventId, witness));
        registry.confirmEvent(eventId, contentHash, witness, 1, deadline, sig1);
    }

    function test_signatureReplay() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signConfirmation(witnessPk, eventId, contentHash, witness, 0, deadline);
        registry.confirmEvent(eventId, contentHash, witness, 0, deadline, sig);

        // Same sig / nonce against a different event should fail on nonce
        bytes32 otherEvent = keccak256("event-2");
        vm.expectRevert(EIP712Verifier.InvalidNonce.selector);
        registry.confirmEvent(otherEvent, contentHash, witness, 0, deadline, sig);
    }

    function test_expiredSignature() public {
        uint256 deadline = block.timestamp + 10;
        bytes memory sig = _signConfirmation(witnessPk, eventId, contentHash, witness, 0, deadline);

        vm.warp(deadline + 1);
        vm.expectRevert(EIP712Verifier.SignatureExpired.selector);
        registry.confirmEvent(eventId, contentHash, witness, 0, deadline, sig);
    }

    function test_wrongSigner() public {
        uint256 otherPk = 0xB0B;
        uint256 deadline = block.timestamp + 1 hours;
        // Signed by other but claimed as witness
        bytes memory sig = _signConfirmation(otherPk, eventId, contentHash, witness, 0, deadline);

        vm.expectRevert(EIP712Verifier.InvalidSigner.selector);
        registry.confirmEvent(eventId, contentHash, witness, 0, deadline, sig);
    }

    function test_withdrawConfirmation() public {
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signConfirmation(witnessPk, eventId, contentHash, witness, 0, deadline);
        bytes32 confirmationId = registry.confirmEvent(eventId, contentHash, witness, 0, deadline, sig);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(WitnessRegistry.NotConfirmationWitness.selector, confirmationId, other));
        registry.withdrawConfirmation(confirmationId);

        vm.prank(witness);
        registry.withdrawConfirmation(confirmationId);

        assertTrue(registry.getConfirmation(confirmationId).withdrawn);
        assertFalse(registry.hasWitnessed(eventId, witness));
        assertEq(registry.getReputation(witness).withdrawnConfirmations, 1);
        assertEq(registry.getReputation(witness).confirmedEvents, 0);

        // Can confirm again after withdraw
        bytes memory sig2 = _signConfirmation(witnessPk, eventId, contentHash, witness, 1, deadline);
        registry.confirmEvent(eventId, contentHash, witness, 1, deadline, sig2);
        assertTrue(registry.hasWitnessed(eventId, witness));
    }

    function test_pause() public {
        vm.prank(admin);
        registry.pause();

        uint256 deadline = block.timestamp + 1 hours;
        bytes memory sig = _signConfirmation(witnessPk, eventId, contentHash, witness, 0, deadline);
        vm.expectRevert();
        registry.confirmEvent(eventId, contentHash, witness, 0, deadline, sig);
    }

    function testFuzz_confirmUniqueEvents(bytes32 eid, bytes32 ch) public {
        vm.assume(eid != bytes32(0) && ch != bytes32(0));
        uint256 nonce = registry.nonces(witness);
        uint256 deadline = block.timestamp + 1 days;
        bytes memory sig = _signConfirmation(witnessPk, eid, ch, witness, nonce, deadline);
        bytes32 cid = registry.confirmEvent(eid, ch, witness, nonce, deadline, sig);
        assertEq(registry.getConfirmation(cid).witness, witness);
    }
}
