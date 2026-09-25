// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SingletonSwap.sol";
import "../src/mocks/MockToken.sol";
import "../src/mocks/MockFeeToken.sol";

contract SystemTest is Test {
    SingletonSwap singleton;
    MockToken tokenA;
    MockToken tokenB;
    MockToken tokenC;
    MockFeeToken feeToken; // Fee-On-Transfer token

    address alice = address(0x1);
    address bob = address(0x2);

    function setUp() public {
        singleton = new SingletonSwap();
        tokenA = new MockToken("Token A", "TKA", 18);
        tokenB = new MockToken("Token B", "TKB", 18);
        tokenC = new MockToken("Token C", "TKC", 18);
        feeToken = new MockFeeToken("Fee Token", "FEE", 18); // 5% fee on transfer

        tokenA.mint(alice, 1000 ether);
        tokenB.mint(alice, 1000 ether);
        tokenC.mint(alice, 1000 ether);
        feeToken.mint(alice, 1000 ether);

        tokenA.mint(bob, 1000 ether);
        tokenB.mint(bob, 1000 ether);
        tokenC.mint(bob, 1000 ether);
        feeToken.mint(bob, 1000 ether);

        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        vm.startPrank(alice);
        tokenA.approve(address(singleton), type(uint256).max);
        tokenB.approve(address(singleton), type(uint256).max);
        tokenC.approve(address(singleton), type(uint256).max);
        feeToken.approve(address(singleton), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        tokenA.approve(address(singleton), type(uint256).max);
        tokenB.approve(address(singleton), type(uint256).max);
        tokenC.approve(address(singleton), type(uint256).max);
        feeToken.approve(address(singleton), type(uint256).max);
        vm.stopPrank();
    }

    // Test 1: Standard Liquidity & Swap
    function test_StandardFlow() public {
        vm.startPrank(alice);
        // Add Liquidity
        (, , uint256 liq) = singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 ether,
            100 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        assertTrue(liq > 0, "Liquidity mint failed");

        // Check User Position
        SingletonSwap.PositionInfo[] memory positions = singleton
            .getUserPositions(alice);
        assertEq(positions.length, 1, "Should have 1 position");
        assertEq(positions[0].liquidity, liq, "Liquidity amount mismatch");
        vm.stopPrank();

        // Swap by Bob
        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);

        uint256[] memory amounts = singleton.swapExactTokensForTokens(
            10 ether, // Input 10 TKA
            0,
            path,
            bob,
            block.timestamp
        );
        // Standard constant product check roughly
        // 100*100 = 10000
        // New A = 110. B = 10000/110 = 90.909...
        // Out = 100 - 90.909 = 9.09...
        // With validation
        assertEq(amounts[1], 9066108938801491315, "Swap output mismatch"); // Calculated amount
        // Wait, SingletonSwap uses SwapMath.
        // Swap logic: (reserve0 + amountIn - amountOut) * 1000 ...
        vm.stopPrank();
    }

    // Test 2: Native ETH (BNB) Flow
    function test_NativeETHFlow() public {
        vm.startPrank(alice);
        // Add Liquidity ETH/TokenA
        singleton.addLiquidityETH{value: 10 ether}(
            address(tokenA),
            100 ether, // 1 ETH = 10 TokenA price
            0,
            0,
            alice,
            block.timestamp
        );
        vm.stopPrank();

        // Swap ETH -> TokenA
        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(0); // ETH
        path[1] = address(tokenA);

        uint256[] memory amounts = singleton.swapExactETHForTokens{
            value: 1 ether
        }(0, path, bob, block.timestamp);
        assertTrue(amounts[1] > 0, "Swap ETH -> Token failed");
        vm.stopPrank();
    }

    // Test 3: Fee On Transfer Token
    function test_FeeOnTransfer() public {
        vm.startPrank(alice);
        // Alice adds 100 FEE and 100 TKA
        // FEE takes 5% on transfer.
        // Singleton receives 95 FEE.
        singleton.addLiquidity(
            address(feeToken),
            address(tokenA),
            100 ether,
            100 ether,
                0,
                0,
                alice,
                block.timestamp
            );
        // Actual FEE in pool should be 95 ether
        (uint256 resFEE, ) = singleton.getReserves(
            address(feeToken),
            address(tokenA)
        );
        assertEq(resFEE, 95 ether, "FOT reserve mismatch");
        vm.stopPrank();

        // Swap TKA -> FEE
        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(feeToken);

        singleton.swapExactTokensForTokens(
            10 ether,
            0,
            path,
            bob,
            block.timestamp
        );
        // Takes 10 TKA.
        // Returns some FEE.
        // When Singleton sends FEE to Bob, another 5% is cut?
        // MockFeeToken usually cuts on transfer.
        // _safeTransfer might trigger it.
        uint256 bobBal = feeToken.balanceOf(bob);
        // bobBal should be approx amounts[1] * 0.95 (if transfer tax applies on out too)
        // MockFeeToken implementation: _transfer(sender, recipient... tax)
        assertTrue(bobBal > 0, "FOT Swap failed");
        vm.stopPrank();
    }

    function test_FeeOnTransferInputResyncsAmounts() public {
        vm.startPrank(alice);
        singleton.addLiquidity(
            address(feeToken),
            address(tokenA),
            200 ether,
            200 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        vm.stopPrank();

        vm.startPrank(bob);
        address[] memory path = new address[](2);
        path[0] = address(feeToken);
        path[1] = address(tokenA);

        uint256 balBefore = tokenA.balanceOf(bob);
        uint256[] memory amounts = singleton.swapExactTokensForTokens(
            20 ether,
            0,
            path,
            bob,
            block.timestamp
        );

        assertGt(tokenA.balanceOf(bob) - balBefore, 0, "No token received");
        assertLt(amounts[0], 20 ether, "Should recompute actual input");
        vm.stopPrank();
    }

    // Test 4: Internal LP Transfer
    function test_LPTransfer() public {
        vm.startPrank(alice);
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 ether,
            100 ether,
            0,
            0,
            alice,
            block.timestamp
        );

        SingletonSwap.PositionInfo[] memory posAlice = singleton
            .getUserPositions(alice);
        bytes32 key = posAlice[0].key;
        uint256 amount = posAlice[0].liquidity;

        // Transfer half to Bob
        singleton.transferLP(key, bob, amount / 2);

        // Verify Alice
        SingletonSwap.PositionInfo[] memory posAliceAfter = singleton
            .getUserPositions(alice);
        assertEq(posAliceAfter[0].liquidity, amount - (amount / 2));

        // Verify Bob
        SingletonSwap.PositionInfo[] memory posBob = singleton.getUserPositions(
            bob
        );
        assertEq(posBob.length, 1, "Bob should have position");
        assertEq(posBob[0].liquidity, amount / 2, "Bob liquidity mismatch");
        vm.stopPrank();
    }

    function test_MultiHopSwap() public {
        vm.startPrank(alice);
        singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            200 ether,
            200 ether,
            0,
            0,
            alice,
            block.timestamp
        );

        singleton.addLiquidity(
            address(tokenB),
            address(tokenC),
            200 ether,
            200 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        vm.stopPrank();

        vm.startPrank(bob);
        address[] memory path = new address[](3);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        path[2] = address(tokenC);

        uint256 balBefore = tokenC.balanceOf(bob);
        uint256[] memory amounts = singleton.swapExactTokensForTokens(
            10 ether,
            0,
            path,
            bob,
            block.timestamp
        );
        vm.stopPrank();

        assertEq(amounts.length, 3, "Path output mismatch");
        assertGt(tokenC.balanceOf(bob) - balBefore, 0, "Bob received nothing");
    }

    function test_RemoveAndReaddLiquidityTokens() public {
        vm.startPrank(alice);
        (, , uint256 liquidity) = singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            200 ether,
            200 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        assertTrue(liquidity > 0, "Initial liquidity failed");

        singleton.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidity,
            0,
            0,
            alice,
            block.timestamp
        );

        (uint256 resA, uint256 resB) = singleton.getReserves(
            address(tokenA),
            address(tokenB)
        );
        assertLt(resA, 1e12, "Token A reserves should be effectively zero");
        assertLt(resB, 1e12, "Token B reserves should be effectively zero");

        (, , uint256 secondLiq) = singleton.addLiquidity(
            address(tokenA),
            address(tokenB),
            300 ether,
            300 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        assertTrue(secondLiq > 0, "Second liquidity mint failed");
        vm.stopPrank();
    }

    function test_RemoveAndReaddLiquidityETH() public {
        vm.deal(alice, 50 ether);
        vm.startPrank(alice);
        (, , uint256 liquidity) = singleton.addLiquidityETH{value: 5 ether}(
            address(tokenA),
            50 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        assertTrue(liquidity > 0, "Initial ETH liquidity failed");

        singleton.removeLiquidityETH(
            address(tokenA),
            liquidity,
            0,
            0,
            alice,
            block.timestamp
        );

        (uint256 resEth, uint256 resToken) = singleton.getReserves(
            address(0),
            address(tokenA)
        );
        assertLt(resEth, 1e12, "ETH reserves should be effectively zero");
        assertLt(resToken, 1e12, "Token reserves should be effectively zero");

        (, , uint256 secondLiq) = singleton.addLiquidityETH{value: 8 ether}(
            address(tokenA),
            80 ether,
            0,
            0,
            alice,
            block.timestamp
        );
        assertTrue(secondLiq > 0, "Second ETH liquidity mint failed");
        vm.stopPrank();
    }
}
