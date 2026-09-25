// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SingletonSwap.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy SingletonSwap
        SingletonSwap singleton = new SingletonSwap();

        console.log("SingletonSwap deployed to:", address(singleton));
        console.log("ETH_ADDRESS constant:", singleton.ETH_ADDRESS());

        vm.stopBroadcast();
    }
}
