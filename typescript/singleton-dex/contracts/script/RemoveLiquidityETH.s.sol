// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SingletonSwap.sol";

contract RemoveLiquidityETH is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable singletonAddress = payable(
            vm.envAddress("SINGLETON_ADDRESS")
        );
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        // Amount of LP tokens to remove
        uint256 liquidity = vm.envOr("LIQUIDITY_AMOUNT", uint256(1 ether));

        vm.startBroadcast(deployerPrivateKey);

        SingletonSwap singleton = SingletonSwap(singletonAddress);

        console.log("Removing liquidity:");
        console.log("  LP tokens:", liquidity);

        (uint256 amountToken, uint256 amountETH) = singleton.removeLiquidityETH(
            tokenAddress,
            liquidity,
            0, // amountTokenMin
            0, // amountETHMin
            msg.sender,
            block.timestamp + 300 // 5 min deadline
        );

        console.log("Liquidity removed!");
        console.log("  Token received:", amountToken);
        console.log("  ETH received:", amountETH);

        vm.stopBroadcast();
    }
}
