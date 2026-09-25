// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "src/SingletonSwap.sol";
import "./mocks/MockERC20.sol";

contract SingletonSwapTest is Test {
    SingletonSwap singleton;
    MockERC20 tokenA;
    MockERC20 tokenB;
    MockERC20 tokenC;

    receive() external payable {}

    function setUp() public {
        singleton = new SingletonSwap();
        tokenA = new MockERC20("Token A", "TKA", 1000000 ether);
        tokenB = new MockERC20("Token B", "TKB", 1000000 ether);
        tokenC = new MockERC20("Token C", "TKC", 1000000 ether);

        tokenA.approve(address(singleton), type(uint256).max);
        tokenB.approve(address(singleton), type(uint256).max);
        tokenC.approve(address(singleton), type(uint256).max);
    }

    function testAddLiquidity() public {
        uint256 amountA = 1000 ether;
        uint256 amountB = 1000 ether;

        (uint256 addedA, uint256 addedB, uint256 liquidity) = singleton
            .addLiquidity(
                address(tokenA),
                address(tokenB),
                amountA,
                amountB,
                0,
                0,
                address(this),
                block.timestamp
            );

        assertEq(addedA, amountA);
        assertEq(addedB, amountB);
        assertGt(liquidity, 0);

        (uint256 reserveA, uint256 reserveB) = singleton.getReserves(
            address(tokenA),
            address(tokenB)
        );
        assertEq(reserveA, amountA);
        assertEq(reserveB, amountB);
    }

    function testAddLiquidityRevertsWhenExpired() public {
        vm.expectRevert("SingletonSwap: EXPIRED");
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp - 1
        );
    }

    function testAddLiquidityRevertsIdenticalTokens() public {
        vm.expectRevert("SingletonSwap: IDENTICAL_ADDRESSES");
        singleton.addLiquidity(
            address(tokenA),
            address(tokenA),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );
    }

    function testAddLiquidityETH() public {
        uint256 amountToken = 1000 ether;
        uint256 amountETH = 10 ether;

        (uint256 addedToken, uint256 addedETH, uint256 liquidity) = singleton
            .addLiquidityETH{value: amountETH}(
            address(tokenA),
            amountToken,
            0,
            0,
            address(this),
            block.timestamp
        );

        assertEq(addedToken, amountToken);
        assertEq(addedETH, amountETH);
        assertGt(liquidity, 0);

        (uint256 reserveA, uint256 reserveB) = singleton.getReserves(
            address(tokenA),
            address(0)
        ); // ETH is address 0
        // tokenA > address(0) ? YES.
        // So getReserves(tokenA, 0) -> token0=0, token1=A.
        // returns (A, B) based on input order or default?
        // getReserves(A, B) -> if A==token0 returns (r0, r1).
        // token0 is ETH. tokenA is token1.
        // getReserves(A, ETH) -> A==token0 false. returns (r1, r0).
        // r1 is reserve1 (TokenA). r0 is reserve0 (ETH).
        // So returns (TokenA, ETH).
        assertEq(reserveA, amountToken); // TokenA
        assertEq(reserveB, amountETH); // ETH
    }

    function testMultiPoolIsolation() public {
        // Pool 1: A/B
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        // Pool 2: A/C
        singleton.addLiquidity(
            address(tokenA),
            address(tokenC),
            500 ether,
            500 ether,
            0,
            0,
            address(this),
            block.timestamp
        ); // 500 A added here

        // Total A in contract should be 1500
        assertEq(tokenA.balanceOf(address(singleton)), 1500 ether);

        // Check reserves
        (uint256 rA_AB, uint256 rB_AB) = singleton.getReserves(
            address(tokenA),
            address(tokenB)
        );
        assertEq(rA_AB, 1000 ether);
        assertEq(rB_AB, 1000 ether);

        (uint256 rA_AC, uint256 rC_AC) = singleton.getReserves(
            address(tokenA),
            address(tokenC)
        );
        assertEq(rA_AC, 500 ether);
        assertEq(rC_AC, 500 ether);
    }

    function testSwap() public {
        // Pool: A/B = 1000/1000
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        // Swap 10 A for B
        uint256 amountIn = 10 ether;
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint256[] memory amounts = singleton.swapExactTokensForTokens(
            amountIn,
            0,
            path,
            address(this),
            block.timestamp
        );

        // Expect B out
        uint256 amountOut = amounts[1];
        // 1000 * 1000 = (1000 + 10*(0.997)) * (1000 - out)
        // 1,000,000 = 1009.97 * (1000 - out)
        // 1000 - out = 1,000,000 / 1009.97 = 990.128...
        // out = 1000 - 990.128 = 9.87...

        assertGt(amountOut, 9 ether);
        assertLt(amountOut, 10 ether);

        // Verify reserves updated correctly
        (uint256 rA, uint256 rB) = singleton.getReserves(
            address(tokenA),
            address(tokenB)
        );
        assertEq(rA, 1000 ether + amountIn);
        assertEq(rB, 1000 ether - amountOut);
    }

    function testRemoveLiquidity() public {
        (, , uint256 liquidity) = singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 balABefore = tokenA.balanceOf(address(this));

        singleton.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 balAAfter = tokenA.balanceOf(address(this));

        assertEq(balAAfter - balABefore, 1000 ether - 1000); // MINIMUM_LIQUIDITY locked involved?
        // Wait, MINIMUM_LIQUIDITY is 1000 wei.
        // removeLiquidity burns user's liquidity. user has (minted - 1000).
        // So user gets back (1000 ether * (minted - 1000)) / minted.
        // Almost 1000 ether.

        assertApproxEqAbs(balAAfter - balABefore, 1000 ether, 2000); // Tolerance for min liquidity
    }

    function testRemoveLiquidityETH() public {
        vm.deal(address(this), 100 ether);
        (, , uint256 liquidity) = singleton.addLiquidityETH{value: 10 ether}(
            address(tokenA),
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 balTokenBefore = tokenA.balanceOf(address(this));
        uint256 balETHBefore = address(this).balance;

        (uint256 tokenOut, uint256 ethOut) = singleton.removeLiquidityETH(
            address(tokenA),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp
        );

        assertGt(tokenOut, 0);
        assertGt(ethOut, 0);
        assertEq(tokenA.balanceOf(address(this)) - balTokenBefore, tokenOut);
        assertEq(address(this).balance - balETHBefore, ethOut);
    }

    function testSwapTokensForExactETH() public {
        vm.deal(address(this), 100 ether);
        singleton.addLiquidityETH{value: 50 ether}(
            address(tokenA),
            5000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 ethBefore = address(this).balance;
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(0);

        uint256[] memory amounts = singleton.swapTokensForExactETH(
            1 ether,
            type(uint256).max,
            path,
            address(this),
            block.timestamp
        );

        assertEq(amounts[1], 1 ether);
        assertEq(address(this).balance - ethBefore, 1 ether);
    }

    function testSwapETHForExactTokensRefunds() public {
        vm.txGasPrice(0);
        vm.deal(address(this), 100 ether);
        singleton.addLiquidityETH{value: 20 ether}(
            address(tokenA),
            2000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        uint256 balBefore = address(this).balance;
        address[] memory path = new address[](2);
        path[0] = address(0);
        path[1] = address(tokenA);

        uint256[] memory amounts = singleton.swapETHForExactTokens{
            value: 5 ether
        }(5 ether, path, address(this), block.timestamp);

        assertEq(amounts[1], 5 ether);
        uint256 ethSpent = balBefore - address(this).balance;
        assertEq(ethSpent, amounts[0]);
        assertLt(ethSpent, 5 ether);
    }

    function testTokenRegistryTracksUniqueTokens() public {
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        singleton.addLiquidity(
            address(tokenB),
            address(tokenC),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        assertEq(singleton.getTokensLength(), 3);

        SingletonSwap.TokenInfo[] memory items = singleton.getTokensPaginated(
            0,
            10
        );
        assertEq(items.length, 3);
        assertEq(items[0].token, address(tokenA));
        assertEq(items[1].token, address(tokenB));
        assertEq(items[2].token, address(tokenC));
    }

    function testUserPositionsClearedAfterWithdrawal() public {
        (, , uint256 liquidity) = singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        singleton.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidity,
            0,
            0,
            address(this),
            block.timestamp
        );

        SingletonSwap.PositionInfo[] memory positions = singleton
            .getUserPositions(address(this));
        assertEq(positions.length, 0);
    }

    function testTransferLPRevertsToZeroAddress() public {
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        SingletonSwap.PositionInfo[] memory positions = singleton
            .getUserPositions(address(this));
        bytes32 key = positions[0].key;

        vm.expectRevert("SingletonSwap: ZERO_ADDRESS");
        singleton.transferLP(key, address(0), positions[0].liquidity / 2);
    }

    function testSwapExactETHForTokensRevertsInvalidPath() public {
        // Path does not start with ETH
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert("SingletonSwap: INVALID_PATH");
        singleton.swapExactETHForTokens{value: 1 ether}(
            0,
            path,
            address(this),
            block.timestamp
        );
    }

    function testSwapTokensForExactETHRevertsExcessiveInput() public {
        // Setup pool
        singleton.addLiquidityETH{value: 10 ether}(
            address(tokenA),
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(0);

        // Try to swap with max input less than required
        vm.expectRevert("SingletonSwap: EXCESSIVE_INPUT_AMOUNT");
        singleton.swapTokensForExactETH(
            1 ether, // amountOut
            100, // amountInMax (too low)
            path,
            address(this),
            block.timestamp
        );
    }

    function testSwapExactTokensForTokensRevertsInsufficientOutput() public {
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            address(this),
            block.timestamp
        );

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        vm.expectRevert("SingletonSwap: INSUFFICIENT_OUTPUT_AMOUNT");
        singleton.swapExactTokensForTokens(
            10 ether,
            100 ether, // minAmountOut exceeds possible output
            path,
            address(this),
            block.timestamp
        );
    }
}
