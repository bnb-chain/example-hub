// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/LendingPool.sol";
import "../src/MockToken.sol";
import "../src/ChainlinkPriceOracle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        MockToken usdc = new MockToken("Mock USDC", "mUSDC");
        MockToken bnb = new MockToken("Mock BNB", "mBNB"); // Logic for WBNB usually, but mock for now

        // Deploy ChainlinkPriceOracle (can be configured later)
        ChainlinkPriceOracle chainlinkOracle = new ChainlinkPriceOracle();

        // Use ChainlinkPriceOracle
        LendingPool pool = new LendingPool(address(chainlinkOracle));

        pool.addSupportedToken(address(usdc));
        pool.addSupportedToken(address(bnb));

        // Mint some initial tokens to deployer for testing
        usdc.mint(deployer, 1000000e18);
        bnb.mint(deployer, 10000e18);

        vm.stopBroadcast();

        console.log("Deployed Contracts:");
        console.log("Deployer:", deployer);
        console.log("USDC:", address(usdc));
        console.log("BNB:", address(bnb));
        console.log("Chainlink Oracle:", address(chainlinkOracle));
        console.log("LendingPool:", address(pool));
    }
}
