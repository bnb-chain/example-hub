// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SingletonSwap.sol";
import "../src/mocks/MockToken.sol";

contract DeployAndSwap is Script {
    uint256 private constant LIQUIDITY_ETH = 0.01 ether;
    uint256 private constant SWAP_ETH = 0.001 ether;
    uint256 private constant LIQUIDITY_TOKEN = 10 ether;
    uint256 private constant INITIAL_MINT = 1_000 ether;

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        vm.startBroadcast(deployerPk);

        SingletonSwap singleton = new SingletonSwap();
        MockToken token = new MockToken("Mock Token", "MOCK", 18);
        token.mint(deployer, INITIAL_MINT);

        token.approve(address(singleton), type(uint256).max);

        (, , uint256 liquidity) = singleton.addLiquidityETH{value: LIQUIDITY_ETH}(
            address(token),
            LIQUIDITY_TOKEN,
            0,
            0,
            deployer,
            block.timestamp + 15 minutes
        );
        console.log("Added liquidity:", liquidity);

        address[] memory buyPath = new address[](2);
        buyPath[0] = singleton.ETH_ADDRESS();
        buyPath[1] = address(token);

        uint256[] memory buyAmounts = singleton.swapExactETHForTokens{value: SWAP_ETH}(
            0,
            buyPath,
            deployer,
            block.timestamp + 15 minutes
        );
        uint256 tokensBought = buyAmounts[buyAmounts.length - 1];
        console.log("Tokens bought:", tokensBought);

        address[] memory sellPath = new address[](2);
        sellPath[0] = address(token);
        sellPath[1] = singleton.ETH_ADDRESS();

        uint256[] memory sellAmounts = singleton.swapExactTokensForETH(
            tokensBought,
            0,
            sellPath,
            deployer,
            block.timestamp + 15 minutes
        );

        console.log("ETH received from sell:", sellAmounts[sellAmounts.length - 1]);
        console.log("SingletonSwap:", address(singleton));
        console.log("Mock token:", address(token));

        vm.stopBroadcast();
    }
}
