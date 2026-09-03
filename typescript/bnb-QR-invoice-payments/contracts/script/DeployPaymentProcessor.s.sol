// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Script} from "forge-std/Script.sol";
import {PaymentProcessor, IERC20} from "../src/PaymentProcessor.sol";

contract DeployPaymentProcessor is Script {
    function run(address stablecoin, address merchantPayout) external returns (PaymentProcessor) {
        vm.startBroadcast();
        PaymentProcessor processor = new PaymentProcessor(IERC20(stablecoin));
        if (merchantPayout != address(0)) {
            processor.registerMerchant(merchantPayout);
        }
        vm.stopBroadcast();
        return processor;
    }
}
