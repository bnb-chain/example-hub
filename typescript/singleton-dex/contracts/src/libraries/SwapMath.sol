// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library SwapMath {
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }

    function add(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x + y) >= x, 'ds-math-add-overflow');
    }

    function sub(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require((z = x - y) <= x, 'ds-math-sub-underflow');
    }

    function mul(uint256 x, uint256 y) internal pure returns (uint256 z) {
        require(y == 0 || (z = x * y) / y == x, 'ds-math-mul-overflow');
    }

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) internal pure returns (uint256 amountB) {
        require(amountA > 0, 'SingletonSwap: INSUFFICIENT_AMOUNT');
        require(reserveA > 0 && reserveB > 0, 'SingletonSwap: INSUFFICIENT_LIQUIDITY');
        amountB = mul(amountA, reserveB) / reserveA;
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountOut) {
        require(amountIn > 0, 'SingletonSwap: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'SingletonSwap: INSUFFICIENT_LIQUIDITY');
        uint256 amountInWithFee = mul(amountIn, 997);
        uint256 numerator = mul(amountInWithFee, reserveOut);
        uint256 denominator = add(mul(reserveIn, 1000), amountInWithFee);
        amountOut = numerator / denominator;
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountIn) {
        require(amountOut > 0, 'SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'SingletonSwap: INSUFFICIENT_LIQUIDITY');
        uint256 numerator = mul(reserveIn, amountOut) * 1000;
        uint256 denominator = mul(sub(reserveOut, amountOut), 997);
        amountIn = (numerator / denominator) + 1;
    }
}
