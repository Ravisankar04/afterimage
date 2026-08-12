// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AfterimageRegistry} from "../src/AfterimageRegistry.sol";
import {EventRegistry} from "../src/EventRegistry.sol";
import {EvidenceRegistry} from "../src/EvidenceRegistry.sol";
import {WitnessRegistry} from "../src/WitnessRegistry.sol";
import {DisputeRegistry} from "../src/DisputeRegistry.sol";
import {OwnershipRegistry} from "../src/OwnershipRegistry.sol";

/**
 * @title Deploy
 * @notice Deploys the full AFTERIMAGE registry suite.
 * @dev Set ADMIN via env or defaults to msg.sender (broadcaster).
 */
contract Deploy is Script {
    function run() external {
        address admin = vm.envOr("ADMIN", msg.sender);
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0));

        if (deployerKey != 0) {
            vm.startBroadcast(deployerKey);
        } else {
            vm.startBroadcast();
        }

        AfterimageRegistry afterimageRegistry = new AfterimageRegistry(admin);
        EventRegistry eventRegistry = new EventRegistry(admin);
        EvidenceRegistry evidenceRegistry = new EvidenceRegistry(admin);
        WitnessRegistry witnessRegistry = new WitnessRegistry(admin);
        DisputeRegistry disputeRegistry = new DisputeRegistry(admin);
        OwnershipRegistry ownershipRegistry = new OwnershipRegistry(admin, address(afterimageRegistry));

        console2.log("AfterimageRegistry", address(afterimageRegistry));
        console2.log("EventRegistry", address(eventRegistry));
        console2.log("EvidenceRegistry", address(evidenceRegistry));
        console2.log("WitnessRegistry", address(witnessRegistry));
        console2.log("DisputeRegistry", address(disputeRegistry));
        console2.log("OwnershipRegistry", address(ownershipRegistry));
        console2.log("Admin", admin);

        vm.stopBroadcast();
    }
}
