// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console2} from "forge-std/Script.sol";
import {MassPayout} from "../src/MassPayout.sol";
import {MockUSDT} from "../src/mocks/MockTokens.sol";

contract DeployMassPayout is Script {
    function run() external {
        address owner = vm.envAddress("MASS_PAYOUT_OWNER");

        vm.startBroadcast();
        MassPayout payout = new MassPayout(owner == address(0) ? msg.sender : owner);
        MockUSDT usdt = new MockUSDT();
        vm.stopBroadcast();

        console2.log("MassPayout:", address(payout));
        console2.log("MockUSDT:", address(usdt));
    }
}
