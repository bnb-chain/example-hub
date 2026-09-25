// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SingletonSwap.sol";
import "../src/interfaces/IERC20.sol";

contract AddLiquidityETH is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable singletonAddress = payable(
            vm.envAddress("SINGLETON_ADDRESS")
        );
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        // Amount of ETH to add (in ether)
        uint256 ethAmount = vm.envOr("ETH_AMOUNT", uint256(0.01 ether));
        // Amount of token to add (in token units, 18 decimals assumed)
        uint256 tokenAmount = vm.envOr("TOKEN_AMOUNT", uint256(10 ether));

        vm.startBroadcast(deployerPrivateKey);

        SingletonSwap singleton = SingletonSwap(singletonAddress);
        IERC20 token = IERC20(tokenAddress);

        // Approve token
        console.log("Approving token...");
        token.approve(singletonAddress, tokenAmount);

        // Add liquidity
        console.log("Adding liquidity:");
        console.log("  ETH:", ethAmount);
        console.log("  Token:", tokenAmount);

        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = singleton
            .addLiquidityETH{value: ethAmount}(
            tokenAddress,
            tokenAmount,
            0, // amountTokenMin (no slippage protection for demo)
            0, // amountETHMin
            msg.sender,
            block.timestamp + 300 // 5 min deadline
        );

        console.log("Liquidity added!");
        console.log("  Token amount:", amountToken);
        console.log("  ETH amount:", amountETH);
        console.log("  LP tokens:", liquidity);

        vm.stopBroadcast();
    }
}
