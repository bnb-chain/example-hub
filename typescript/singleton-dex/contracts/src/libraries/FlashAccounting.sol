// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IERC20.sol";

library FlashAccounting {
    error InsufficientBalance();
    error PoolNotSettled();

    // Standard ERC20 transfer, but we wrap it to handle the delta logic in the main contract
    // explicitly rather than implicitly via transferFroms during the swap loop.

    function safeAdd(int256 a, int256 b) internal pure returns (int256) {
        return a + b;
    }

    function safeSub(int256 a, int256 b) internal pure returns (int256) {
        return a - b;
    }
}
