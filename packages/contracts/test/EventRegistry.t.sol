// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {EventRegistry} from "../src/EventRegistry.sol";

contract EventRegistryTest is Test {
    EventRegistry internal registry;

    address internal admin = makeAddr("admin");
    address internal alice = makeAddr("alice");

    bytes32 internal afterimageId = keccak256("afterimage-1");
    bytes32 internal content = keccak256("content");
    bytes32 internal meta = keccak256("meta");
    bytes32 internal location = keccak256("loc");

    function setUp() public {
        registry = new EventRegistry(admin);
    }

    function test_createEvent_root() public {
        vm.prank(alice);
        bytes32 eventId = registry.createEvent(
            afterimageId, bytes32(0), EventRegistry.EventType.CREATED, content, meta, location, 0
        );

        EventRegistry.EventRecord memory e = registry.getEvent(eventId);
        assertEq(e.afterimageId, afterimageId);
        assertEq(e.parentEventId, bytes32(0));
        assertEq(e.creator, alice);
        assertEq(uint8(e.eventType), uint8(EventRegistry.EventType.CREATED));
        assertTrue(e.exists);

        bytes32[] memory list = registry.getEventsByAfterimage(afterimageId);
        assertEq(list.length, 1);
        assertEq(list[0], eventId);
    }

    function test_createEvent_withValidParent() public {
        vm.prank(alice);
        bytes32 parentId = registry.createEvent(
            afterimageId, bytes32(0), EventRegistry.EventType.CREATED, content, meta, location, 0
        );

        vm.prank(alice);
        bytes32 childId = registry.createEvent(
            afterimageId, parentId, EventRegistry.EventType.OBSERVED, keccak256("c2"), meta, location, 0
        );

        assertEq(registry.getEvent(childId).parentEventId, parentId);
        assertEq(registry.getEventsByAfterimage(afterimageId).length, 2);
    }

    function test_createEvent_invalidParent() public {
        bytes32 fakeParent = keccak256("missing");
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(EventRegistry.ParentEventNotFound.selector, fakeParent));
        registry.createEvent(
            afterimageId, fakeParent, EventRegistry.EventType.OBSERVED, content, meta, location, 0
        );
    }

    function test_createEvent_zeroAfterimage() public {
        vm.prank(alice);
        vm.expectRevert(EventRegistry.InvalidAfterimageId.selector);
        registry.createEvent(bytes32(0), bytes32(0), EventRegistry.EventType.CREATED, content, meta, location, 0);
    }

    function test_createEvent_zeroContent() public {
        vm.prank(alice);
        vm.expectRevert(EventRegistry.InvalidContentHash.selector);
        registry.createEvent(
            afterimageId, bytes32(0), EventRegistry.EventType.CREATED, bytes32(0), meta, location, 0
        );
    }

    function test_getEvent_notFound() public {
        vm.expectRevert(abi.encodeWithSelector(EventRegistry.EventNotFound.selector, bytes32(uint256(9))));
        registry.getEvent(bytes32(uint256(9)));
    }

    function test_pause() public {
        vm.prank(admin);
        registry.pause();

        vm.prank(alice);
        vm.expectRevert();
        registry.createEvent(
            afterimageId, bytes32(0), EventRegistry.EventType.CREATED, content, meta, location, 0
        );
    }

    function test_unauthorizedPause() public {
        vm.prank(alice);
        vm.expectRevert();
        registry.pause();
    }

    function testFuzz_createChain(uint8 depthRaw, bytes32 seed) public {
        uint256 depth = bound(depthRaw, 1, 8);
        bytes32 parent;
        bytes32 aid = keccak256(abi.encode(seed, "aid"));

        for (uint256 i = 0; i < depth; i++) {
            bytes32 c = keccak256(abi.encode(seed, i));
            vm.prank(alice);
            bytes32 id = registry.createEvent(
                aid, parent, EventRegistry.EventType.OBSERVED, c, meta, location, uint64(i + 1)
            );
            if (parent != bytes32(0)) {
                assertEq(registry.getEvent(id).parentEventId, parent);
            }
            parent = id;
        }

        assertEq(registry.getEventsByAfterimage(aid).length, depth);
    }
}
