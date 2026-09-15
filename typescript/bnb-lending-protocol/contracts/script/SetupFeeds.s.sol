// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/ChainlinkPriceOracle.sol";

contract SetupFeeds is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS"); // Must be set in .env

        // BSC Testnet Feeds
        address BNB_USD_FEED = 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526;
        address USDC_USD_FEED = 0x90C069c4538aDAC136E051052e1497297408C305; // Mock/Real dependent on net
        // Note: verify real testnet feed addresses for production use

        // Tokens
        address BNB_TOKEN = 0xE177db9Be00D47D71fDC2bd06a32227011A7580E; // From deploy output
        address USDC_TOKEN = 0x40eb1bd0c7986CE6D45443ebb68538EfF129927D; // From deploy output

        vm.startBroadcast(deployerPrivateKey);

        ChainlinkPriceOracle oracle = ChainlinkPriceOracle(oracleAddress);

        oracle.setPriceFeed(BNB_TOKEN, BNB_USD_FEED);
        oracle.setPriceFeed(USDC_TOKEN, USDC_USD_FEED);

        vm.stopBroadcast();

        console.log("Price Feeds Set for Oracle:", oracleAddress);
    }
}
