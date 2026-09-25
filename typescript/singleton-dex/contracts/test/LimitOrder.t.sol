// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SingletonSwap.sol";
import "./mocks/MockERC20.sol";

contract LimitOrderTest is Test {
    SingletonSwap public swap;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    address public user = address(0x1);
    address public executor = address(0x2);
    address public lp = address(0x3);

    function setUp() public {
        swap = new SingletonSwap();
        tokenA = new MockERC20("Token A", "TKA", 1000000 ether);
        tokenB = new MockERC20("Token B", "TKB", 1000000 ether);

        // Transfer tokens to users
        tokenA.transfer(lp, 1000 ether);
        tokenB.transfer(lp, 1000 ether);
        tokenA.transfer(user, 100 ether);

        // Add liquidity
        vm.startPrank(lp);
        tokenA.approve(address(swap), type(uint256).max);
        tokenB.approve(address(swap), type(uint256).max);

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
        vm.stopPrank();
    }

    function testPlaceOrder() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        uint256 balanceBefore = tokenA.balanceOf(user);

        uint256 orderId = swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );

        uint256 balanceAfter = tokenA.balanceOf(user);

        // Verify order was created
        assertEq(orderId, 1);
        assertEq(balanceBefore - balanceAfter, 10 ether);

        // Check order details
        (
            uint256 id,
            address owner,
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 minAmountOut,
            bool executed
        ) = swap.orders(orderId);

        assertEq(id, 1);
        assertEq(owner, user);
        assertEq(tokenIn, address(tokenA));
        assertEq(tokenOut, address(tokenB));
        assertEq(amountIn, 10 ether);
        assertEq(minAmountOut, 8 ether);
        assertEq(executed, false);

        vm.stopPrank();
    }

    function testCancelOrder() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        uint256 orderId = swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );

        uint256 balanceBefore = tokenA.balanceOf(user);

        swap.cancelOrder(orderId);

        uint256 balanceAfter = tokenA.balanceOf(user);

        // Verify tokens were refunded
        assertEq(balanceAfter - balanceBefore, 10 ether);

        // Verify order is marked as executed
        (, , , , , , bool executed) = swap.orders(orderId);
        assertEq(executed, true);

        vm.stopPrank();
    }

    function testCannotCancelOthersOrder() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        uint256 orderId = swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );
        vm.stopPrank();

        // Try to cancel from different address
        vm.startPrank(executor);
        vm.expectRevert("SingletonSwap: NOT_OWNER");
        swap.cancelOrder(orderId);
        vm.stopPrank();
    }

    function testExecuteOrder() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        uint256 orderId = swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );
        vm.stopPrank();

        // Execute order
        vm.startPrank(executor);

        uint256 userBalanceBBefore = tokenB.balanceOf(user);
        uint256 executorBalanceBBefore = tokenB.balanceOf(executor);

        swap.executeOrder(orderId);

        uint256 userBalanceBAfter = tokenB.balanceOf(user);
        uint256 executorBalanceBAfter = tokenB.balanceOf(executor);

        // Verify user received tokens (minus executor fee)
        uint256 userReceived = userBalanceBAfter - userBalanceBBefore;
        assertGt(userReceived, 8 ether);

        // Verify executor got fee (0.1%)
        uint256 executorFee = executorBalanceBAfter - executorBalanceBBefore;
        assertGt(executorFee, 0);
        assertEq(executorFee, userReceived / 1000);

        // Verify order is marked as executed
        (, , , , , , bool executed) = swap.orders(orderId);
        assertEq(executed, true);

        vm.stopPrank();
    }

    function testCannotExecuteOrderTwice() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        uint256 orderId = swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );
        vm.stopPrank();

        vm.startPrank(executor);
        swap.executeOrder(orderId);

        vm.expectRevert("SingletonSwap: ALREADY_EXECUTED");
        swap.executeOrder(orderId);
        vm.stopPrank();
    }

    function testCannotExecuteOrderWithUnmetPrice() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 10 ether);

        // Place order with unrealistic minAmountOut
        uint256 orderId = swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            50 ether, // Unrealistic price
            block.timestamp + 1 days
        );
        vm.stopPrank();

        vm.startPrank(executor);
        vm.expectRevert("SingletonSwap: PRICE_NOT_MET");
        swap.executeOrder(orderId);
        vm.stopPrank();
    }

    function testGetUserOrders() public {
        vm.startPrank(user);
        tokenA.approve(address(swap), 30 ether);

        swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );

        swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            7 ether,
            block.timestamp + 1 days
        );

        swap.placeOrder(
            address(tokenA),
            address(tokenB),
            10 ether,
            6 ether,
            block.timestamp + 1 days
        );

        uint256[] memory userOrders = swap.getUserOrders(user);
        assertEq(userOrders.length, 3);
        assertEq(userOrders[0], 1);
        assertEq(userOrders[1], 2);
        assertEq(userOrders[2], 3);

        vm.stopPrank();
    }

    function testPlaceOrderWithETH() public {
        // Add ETH/TokenB liquidity
        vm.deal(lp, 100 ether);
        vm.startPrank(lp);

        swap.addLiquidityETH{value: 100 ether}(
            address(tokenB),
            100 ether,
            0,
            0,
            lp,
            block.timestamp
        );
        vm.stopPrank();

        // Place order with ETH
        vm.deal(user, 10 ether);
        vm.startPrank(user);

        uint256 orderId = swap.placeOrder{value: 10 ether}(
            address(0), // ETH
            address(tokenB),
            10 ether,
            8 ether,
            block.timestamp + 1 days
        );

        assertEq(orderId, 1);
        vm.stopPrank();
    }
}
