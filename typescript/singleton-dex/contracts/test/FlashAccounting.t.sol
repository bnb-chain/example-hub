// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SingletonSwap.sol";
import "./mocks/MockERC20.sol";

contract FlashAccountingTest is Test {
    SingletonSwap public swap;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    MockERC20 public tokenC;

    address public user = address(0x1);
    address public lp = address(0x2);

    function setUp() public {
        swap = new SingletonSwap();
        tokenA = new MockERC20("Token A", "TKA", 1000000 ether);
        tokenB = new MockERC20("Token B", "TKB", 1000000 ether);
        tokenC = new MockERC20("Token C", "TKC", 1000000 ether);

        // Mint tokens to LP
        tokenA.mint(lp, 1000 ether);
        tokenB.mint(lp, 1000 ether);
        tokenC.mint(lp, 1000 ether);

        // Mint tokens to user
        tokenA.mint(user, 100 ether);

        // Add liquidity
        vm.startPrank(lp);
        tokenA.approve(address(swap), type(uint256).max);
        tokenB.approve(address(swap), type(uint256).max);
        tokenC.approve(address(swap), type(uint256).max);

        swap.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 ether,
            100 ether,
            0,
            0,
            lp,
            block.timestamp
        );

        swap.addLiquidity(
            address(tokenB),
            address(tokenC),
            100 ether,
            100 ether,
            0,
            0,
            lp,
            block.timestamp
        );
        vm.stopPrank();
    }

    function testMultiHopSwapWithFlashAccounting() public {
        // User swaps A -> B -> C
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        address[] memory path = new address[](3);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        path[2] = address(tokenC);

        uint256 balanceABefore = tokenA.balanceOf(user);
        uint256 balanceCBefore = tokenC.balanceOf(user);

        uint256[] memory amounts = swap.swapExactTokensForTokens(
            10 ether,
            0,
            path,
            user,
            block.timestamp
        );

        uint256 balanceAAfter = tokenA.balanceOf(user);
        uint256 balanceCAfter = tokenC.balanceOf(user);

        // Verify A was deducted
        assertEq(balanceABefore - balanceAAfter, 10 ether);

        // Verify C was received (should be ~8 ether after fees)
        assertGt(balanceCAfter - balanceCBefore, 7 ether);
        assertEq(balanceCAfter - balanceCBefore, amounts[2]);

        vm.stopPrank();
    }

    function testDeltaSettlement() public {
        // Test that deltas are properly settled
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        // Before swap, delta should be 0
        int256 deltaBefore = swap.delta(user, address(tokenB));
        assertEq(deltaBefore, 0);

        swap.swapExactTokensForTokens(10 ether, 0, path, user, block.timestamp);

        // After swap and settlement, delta should be 0 again
        int256 deltaAfter = swap.delta(user, address(tokenB));
        assertEq(deltaAfter, 0);

        vm.stopPrank();
    }

    function testETHSwapWithFlashAccounting() public {
        // Add ETH/TokenA liquidity
        vm.deal(lp, 100 ether);
        vm.startPrank(lp);

        swap.addLiquidityETH{value: 100 ether}(
            address(tokenA),
            100 ether,
            0,
            0,
            lp,
            block.timestamp
        );
        vm.stopPrank();

        // User swaps ETH -> A -> B
        vm.deal(user, 10 ether);
        vm.startPrank(user);

        address[] memory path = new address[](3);
        path[0] = address(0); // ETH
        path[1] = address(tokenA);
        path[2] = address(tokenB);

        uint256 balanceBBefore = tokenB.balanceOf(user);

        swap.swapExactETHForTokens{value: 10 ether}(
            0,
            path,
            user,
            block.timestamp
        );

        uint256 balanceBAfter = tokenB.balanceOf(user);

        // Verify B was received
        assertGt(balanceBAfter - balanceBBefore, 7 ether);

        vm.stopPrank();
    }
}
