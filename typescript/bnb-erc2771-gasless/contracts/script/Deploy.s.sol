// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import "../src/Forwarder.sol";
import "../src/GaslessToken.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy Forwarder
        Forwarder forwarder = new Forwarder();
        console.log("Forwarder deployed at:", address(forwarder));

        // Deploy GaslessToken with Forwarder as trusted forwarder
        GaslessToken token = new GaslessToken(address(forwarder));
        console.log("GaslessToken deployed at:", address(token));
        console.log(
            "Initial supply:",
            token.totalSupply() / 10 ** 18,
            "tokens"
        );

        vm.stopBroadcast();

        // Save deployment addresses to JSON file
        string memory obj = "deployment";
        vm.serializeAddress(obj, "forwarder", address(forwarder));
        string memory finalJson = vm.serializeAddress(
            obj,
            "token",
            address(token)
        );

        string memory deploymentPath = string.concat(
            vm.projectRoot(),
            "/deployments/",
            vm.toString(block.chainid),
            ".json"
        );

        vm.writeJson(finalJson, deploymentPath);
        console.log("Deployment info saved to:", deploymentPath);
    }
}
