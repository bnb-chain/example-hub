// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SingletonSwap.sol";
import "../src/interfaces/IERC20.sol";

contract SwapETHForTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable singletonAddress = payable(
            vm.envAddress("SINGLETON_ADDRESS")
        );
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        // Amount of ETH to swap
        uint256 ethAmount = vm.envOr("ETH_AMOUNT", uint256(0.001 ether));

        vm.startBroadcast(deployerPrivateKey);

        SingletonSwap singleton = SingletonSwap(singletonAddress);

        // Create path: ETH -> Token
        address[] memory path = new address[](2);
        path[0] = singleton.ETH_ADDRESS(); // ETH (address(0))
        path[1] = tokenAddress;

        console.log("Swapping ETH for tokens:");
        console.log("  ETH in:", ethAmount);

        uint256[] memory amounts = singleton.swapExactETHForTokens{
            value: ethAmount
        }(
            0, // amountOutMin (no slippage protection for demo)
            path,
            msg.sender,
            block.timestamp + 300 // 5 min deadline
        );

        console.log("Swap complete!");
        console.log("  ETH in:", amounts[0]);
        console.log("  Tokens out:", amounts[1]);

        vm.stopBroadcast();
    }
}

contract SwapTokensForETH is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address payable singletonAddress = payable(
            vm.envAddress("SINGLETON_ADDRESS")
        );
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        // Amount of tokens to swap
        uint256 tokenAmount = vm.envOr("TOKEN_AMOUNT", uint256(1 ether));

        vm.startBroadcast(deployerPrivateKey);

        SingletonSwap singleton = SingletonSwap(singletonAddress);
        IERC20 token = IERC20(tokenAddress);

        // Approve tokens
        console.log("Approving token...");
        token.approve(singletonAddress, tokenAmount);

        // Create path: Token -> ETH
        address[] memory path = new address[](2);
        path[0] = tokenAddress;
        path[1] = singleton.ETH_ADDRESS(); // ETH (address(0))

        console.log("Swapping tokens for ETH:");
        console.log("  Tokens in:", tokenAmount);

        uint256[] memory amounts = singleton.swapExactTokensForETH(
            tokenAmount,
            0, // amountOutMin (no slippage protection for demo)
            path,
            msg.sender,
            block.timestamp + 300 // 5 min deadline
        );

        console.log("Swap complete!");
        console.log("  Tokens in:", amounts[0]);
        console.log("  ETH out:", amounts[1]);

        vm.stopBroadcast();
    }
}
