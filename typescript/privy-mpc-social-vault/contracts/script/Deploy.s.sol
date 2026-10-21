// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/SocialVault.sol";
import "../src/VaultFactory.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Factory
        VaultFactory factory = new VaultFactory();
        console.log("VaultFactory deployed at:", address(factory));

        // 2. Deploy a Template/Demo Vault (Optional, for easy verification)
        address[] memory guardians = new address[](1);
        guardians[0] = deployer; // Self as guardian for demo

        address demoVault = factory.createVault(guardians, 1);
        console.log("Demo SocialVault deployed at:", demoVault);

        vm.stopBroadcast();
    }
}
