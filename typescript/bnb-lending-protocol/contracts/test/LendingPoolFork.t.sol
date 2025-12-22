// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/LendingPool.sol";
import "../src/MockToken.sol";
import "../src/ChainlinkPriceOracle.sol";
import "../src/interfaces/IERC20.sol";

contract LendingPoolForkTest is Test {
    LendingPool public pool;
    ChainlinkPriceOracle public oracle;

    // BSC Mainnet Chainlink Price Feeds
    address constant BNB_USD_FEED = 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE; // BNB/USD
    address constant USDT_USD_FEED = 0xB97Ad0E74fa7d920791E90258A6E2085088b4320; // USDT/USD

    // BSC Mainnet Tokens
    address constant WBNB = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address constant USDT = 0x55d398326f99059fF775485246999027B3197955;

    address public user = address(0x1234);

    function setUp() public {
        // Create fork (requires BSC_RPC_URL env variable)
        string memory rpcUrl = vm.envString("BSC_RPC_URL");
        vm.createSelectFork(rpcUrl);

        oracle = new ChainlinkPriceOracle();
        pool = new LendingPool(address(oracle));

        // Setup Chainlink price feeds
        oracle.setPriceFeed(WBNB, BNB_USD_FEED);
        oracle.setPriceFeed(USDT, USDT_USD_FEED);

        // Add supported tokens
        pool.addSupportedToken(WBNB);
        pool.addSupportedToken(USDT);

        // Fund user with some tokens
        deal(WBNB, user, 10 ether);
        deal(USDT, user, 10000 * 1e18);

        vm.startPrank(user);
        IERC20(WBNB).approve(address(pool), type(uint256).max);
        IERC20(USDT).approve(address(pool), type(uint256).max);
        vm.stopPrank();
    }

    function testOraclePrices() public view {
        uint256 bnbPrice = oracle.getPrice(WBNB);
        uint256 usdtPrice = oracle.getPrice(USDT);

        console.log("BNB Price:", bnbPrice);
        console.log("USDT Price:", usdtPrice);

        // Basic sanity checks
        assertTrue(bnbPrice > 100e18, "BNB price should be > $100");
        assertTrue(bnbPrice < 1000e18, "BNB price should be < $1000");
        assertTrue(usdtPrice > 0.9e18, "USDT should be ~$1");
        assertTrue(usdtPrice < 1.1e18, "USDT should be ~$1");
    }

    function testDepositOnFork() public {
        vm.startPrank(user);

        uint256 depositAmount = 1 ether;
        pool.deposit(WBNB, depositAmount);

        assertEq(pool.deposits(user, WBNB), depositAmount);
        assertEq(IERC20(WBNB).balanceOf(user), 9 ether);

        vm.stopPrank();
    }

    function testBorrowOnFork() public {
        vm.startPrank(user);

        // Deposit 1 BNB as collateral
        pool.deposit(WBNB, 1 ether);

        vm.stopPrank();

        // Add USDT liquidity to pool (simulate existing deposits)
        deal(USDT, address(pool), 100000 * 1e18);

        vm.startPrank(user);

        // Get BNB price to calculate max borrow
        uint256 bnbPrice = oracle.getPrice(WBNB);
        uint256 collateralValue = (1 ether * bnbPrice) / 1e18;
        uint256 maxBorrow = (collateralValue * 75) / 100; // 75% LTV

        console.log("Collateral Value (USD):", collateralValue);
        console.log("Max Borrow (USD):", maxBorrow);

        // Try to borrow 50% of max
        uint256 borrowAmount = maxBorrow / 2;
        pool.borrow(USDT, borrowAmount);

        assertEq(pool.borrowings(user, USDT), borrowAmount);

        vm.stopPrank();
    }

    function testBorrowFailsWithInsufficientCollateral() public {
        vm.startPrank(user);

        pool.deposit(WBNB, 0.1 ether);

        vm.stopPrank();

        deal(USDT, address(pool), 100000 * 1e18);

        vm.startPrank(user);

        // Try to borrow way more than allowed
        vm.expectRevert("Insufficient collateral");
        pool.borrow(USDT, 10000 * 1e18);

        vm.stopPrank();
    }
}
