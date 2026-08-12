// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AfterimageRegistry} from "../src/AfterimageRegistry.sol";

contract AfterimageRegistryTest is Test {
    AfterimageRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal operator = makeAddr("operator");

    bytes32 internal constant META = keccak256("meta-v1");

    function setUp() public {
        registry = new AfterimageRegistry(admin);
        bytes32 operatorRole = registry.OPERATOR_ROLE();
        vm.prank(admin);
        registry.grantRole(operatorRole, operator);
    }

    function test_createAfterimage() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);

        AfterimageRegistry.Afterimage memory a = registry.getAfterimage(id);
        assertEq(a.creator, alice);
        assertEq(a.owner, alice);
        assertEq(uint8(a.status), uint8(AfterimageRegistry.Status.ACTIVE));
        assertEq(a.metadataHash, META);
        assertTrue(a.exists);
    }

    function test_createAfterimage_revertsZeroMetadata() public {
        vm.prank(alice);
        vm.expectRevert(AfterimageRegistry.InvalidMetadataHash.selector);
        registry.createAfterimage(bytes32(0), 0);
    }

    function test_updateMetadata_onlyOwner() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);

        bytes32 next = keccak256("meta-v2");
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(AfterimageRegistry.NotAfterimageOwner.selector, id, bob));
        registry.updateMetadata(id, next);

        vm.prank(alice);
        registry.updateMetadata(id, next);

        AfterimageRegistry.Afterimage memory a = registry.getAfterimage(id);
        assertEq(a.metadataHash, next);
        assertEq(uint8(a.status), uint8(AfterimageRegistry.Status.CHANGING));
    }

    function test_recordObservation() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);
        bytes32 eventId = keccak256("event-1");

        vm.prank(alice);
        registry.recordObservation(id, eventId, 0);

        AfterimageRegistry.Afterimage memory a = registry.getAfterimage(id);
        assertEq(a.currentEvent, eventId);
    }

    function test_recordObservation_unauthorized() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(AfterimageRegistry.NotAfterimageOwner.selector, id, bob));
        registry.recordObservation(id, keccak256("e"), 0);
    }

    function test_markLastSeen_and_markGone() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);

        vm.prank(alice);
        registry.markLastSeen(id);
        assertEq(uint8(registry.getAfterimage(id).status), uint8(AfterimageRegistry.Status.LAST_SEEN));

        vm.prank(alice);
        registry.markGone(id);
        assertEq(uint8(registry.getAfterimage(id).status), uint8(AfterimageRegistry.Status.GONE));

        vm.prank(alice);
        vm.expectRevert(
            abi.encodeWithSelector(AfterimageRegistry.AfterimageTerminal.selector, id, AfterimageRegistry.Status.GONE)
        );
        registry.updateMetadata(id, keccak256("x"));
    }

    function test_archiveAfterimage() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);

        vm.prank(operator);
        registry.archiveAfterimage(id);
        assertEq(uint8(registry.getAfterimage(id).status), uint8(AfterimageRegistry.Status.ARCHIVED));
    }

    function test_transferOwnership() public {
        vm.prank(alice);
        bytes32 id = registry.createAfterimage(META, 0);

        vm.prank(alice);
        registry.transferOwnership(id, bob);

        assertEq(registry.getAfterimage(id).owner, bob);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(AfterimageRegistry.NotAfterimageOwner.selector, id, alice));
        registry.updateMetadata(id, keccak256("nope"));

        vm.prank(bob);
        registry.updateMetadata(id, keccak256("ok"));
    }

    function test_pause_blocksCreates() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(alice);
        vm.expectRevert();
        registry.createAfterimage(META, 0);

        vm.prank(admin);
        registry.unpause();

        vm.prank(alice);
        registry.createAfterimage(META, 0);
    }

    function test_getAfterimage_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(AfterimageRegistry.AfterimageNotFound.selector, bytes32(uint256(1))));
        registry.getAfterimage(bytes32(uint256(1)));
    }

    function testFuzz_createAndTransfer(address owner, address newOwner, bytes32 meta) public {
        vm.assume(owner != address(0) && newOwner != address(0) && owner != newOwner);
        vm.assume(meta != bytes32(0));
        // Avoid precompile / registry collisions with forge addresses
        vm.assume(uint160(owner) > 0x1000 && uint160(newOwner) > 0x1000);

        vm.prank(owner);
        bytes32 id = registry.createAfterimage(meta, 0);

        vm.prank(owner);
        registry.transferOwnership(id, newOwner);
        assertEq(registry.getAfterimage(id).owner, newOwner);
    }
}

contract AfterimageRegistryInvariantTest is Test {
    AfterimageRegistry internal registry;
    AfterimageHandler internal handler;

    address internal admin = makeAddr("admin");

    function setUp() public {
        registry = new AfterimageRegistry(admin);
        handler = new AfterimageHandler(registry);
        targetContract(address(handler));
    }

    function invariant_goneOrArchived_notMutableViaHandler() public view {
        assertTrue(handler.violations() == 0);
    }
}

contract AfterimageHandler is Test {
    AfterimageRegistry public immutable registry;
    bytes32[] public ids;
    uint256 public violations;

    constructor(AfterimageRegistry registry_) {
        registry = registry_;
    }

    function create(bytes32 meta) external {
        if (meta == bytes32(0)) meta = keccak256(abi.encode(block.timestamp, ids.length));
        bytes32 id = registry.createAfterimage(meta, 0);
        ids.push(id);
    }

    function markGone(uint256 idx) external {
        if (ids.length == 0) return;
        bytes32 id = ids[idx % ids.length];
        AfterimageRegistry.Afterimage memory a = registry.getAfterimage(id);
        if (a.status == AfterimageRegistry.Status.GONE || a.status == AfterimageRegistry.Status.ARCHIVED) return;
        if (a.owner != address(this)) return;
        registry.markGone(id);
    }

    function tryUpdateAfterGone(uint256 idx) external {
        if (ids.length == 0) return;
        bytes32 id = ids[idx % ids.length];
        AfterimageRegistry.Afterimage memory a = registry.getAfterimage(id);
        if (a.status != AfterimageRegistry.Status.GONE && a.status != AfterimageRegistry.Status.ARCHIVED) return;
        try registry.updateMetadata(id, keccak256("should-fail")) {
            violations++;
        } catch {}
    }
}
