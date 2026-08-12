// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {DisputeRegistry} from "../src/DisputeRegistry.sol";

contract DisputeRegistryTest is Test {
    DisputeRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal resolver = makeAddr("resolver");

    bytes32 internal afterimageId = keccak256("ai-1");
    bytes32 internal eventId = keccak256("ev-1");
    bytes32 internal reason = keccak256("reason");

    function setUp() public {
        registry = new DisputeRegistry(admin);
        bytes32 resolverRole = registry.RESOLVER_ROLE();
        vm.prank(admin);
        registry.grantRole(resolverRole, resolver);
    }

    function test_createDispute() public {
        vm.prank(alice);
        bytes32 disputeId = registry.createDispute(afterimageId, eventId, reason);

        DisputeRegistry.Dispute memory d = registry.getDispute(disputeId);
        assertEq(d.claimant, alice);
        assertEq(uint8(d.state), uint8(DisputeRegistry.State.OPEN));
        assertTrue(d.exists);
        assertEq(registry.getDisputesByAfterimage(afterimageId).length, 1);
    }

    function test_submitEvidence_contests() public {
        vm.prank(alice);
        bytes32 disputeId = registry.createDispute(afterimageId, eventId, reason);

        bytes32 evidenceHash = keccak256("evidence");
        vm.prank(bob);
        registry.submitEvidence(disputeId, evidenceHash);

        assertEq(uint8(registry.getDispute(disputeId).state), uint8(DisputeRegistry.State.CONTESTED));
        assertEq(registry.getDisputeEvidence(disputeId).length, 1);
    }

    function test_withdrawDispute() public {
        vm.prank(alice);
        bytes32 disputeId = registry.createDispute(afterimageId, eventId, reason);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(DisputeRegistry.NotClaimant.selector, disputeId, bob));
        registry.withdrawDispute(disputeId);

        vm.prank(alice);
        registry.withdrawDispute(disputeId);

        DisputeRegistry.Dispute memory d = registry.getDispute(disputeId);
        assertEq(uint8(d.state), uint8(DisputeRegistry.State.WITHDRAWN));
        // Never deleted
        assertTrue(d.exists);
    }

    function test_resolveDispute() public {
        vm.prank(alice);
        bytes32 disputeId = registry.createDispute(afterimageId, eventId, reason);

        bytes32 resolution = keccak256("resolution");

        vm.prank(alice);
        vm.expectRevert();
        registry.resolveDispute(disputeId, resolution, true);

        vm.prank(resolver);
        registry.resolveDispute(disputeId, resolution, true);

        DisputeRegistry.Dispute memory d = registry.getDispute(disputeId);
        assertEq(uint8(d.state), uint8(DisputeRegistry.State.RESOLVED));
        assertEq(d.resolutionHash, resolution);
        assertTrue(d.resolvedAt > 0);
    }

    function test_cannotActOnTerminal() public {
        vm.prank(alice);
        bytes32 disputeId = registry.createDispute(afterimageId, eventId, reason);

        vm.prank(alice);
        registry.withdrawDispute(disputeId);

        vm.prank(bob);
        vm.expectRevert(
            abi.encodeWithSelector(
                DisputeRegistry.TerminalDispute.selector, disputeId, DisputeRegistry.State.WITHDRAWN
            )
        );
        registry.submitEvidence(disputeId, keccak256("late"));
    }

    function test_claimsNeverDeleted_afterResolve() public {
        vm.prank(alice);
        bytes32 disputeId = registry.createDispute(afterimageId, eventId, reason);
        vm.prank(resolver);
        registry.resolveDispute(disputeId, keccak256("r"), false);

        DisputeRegistry.Dispute memory d = registry.getDispute(disputeId);
        assertTrue(d.exists);
        assertEq(d.reasonHash, reason);
        assertEq(d.claimant, alice);
    }

    function test_pause() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(alice);
        vm.expectRevert();
        registry.createDispute(afterimageId, eventId, reason);
    }

    function test_invalidInputs() public {
        vm.prank(alice);
        vm.expectRevert(DisputeRegistry.InvalidAfterimageId.selector);
        registry.createDispute(bytes32(0), eventId, reason);

        vm.prank(alice);
        vm.expectRevert(DisputeRegistry.InvalidReasonHash.selector);
        registry.createDispute(afterimageId, eventId, bytes32(0));
    }

    function testFuzz_createAndWithdraw(bytes32 aid, bytes32 eid, bytes32 rh) public {
        vm.assume(aid != bytes32(0) && rh != bytes32(0));
        vm.prank(alice);
        bytes32 id = registry.createDispute(aid, eid, rh);
        vm.prank(alice);
        registry.withdrawDispute(id);
        assertTrue(registry.getDispute(id).exists);
        assertEq(uint8(registry.getDispute(id).state), uint8(DisputeRegistry.State.WITHDRAWN));
    }
}
