// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {MassPayout} from "../src/MassPayout.sol";
import {MockUSDT} from "../src/mocks/MockTokens.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract MassPayoutTest is Test {
    MassPayout internal payout;
    MockUSDT internal usdt;

    address internal admin = address(0xA11CE);
    address internal payer = address(0xBEEF);

    function setUp() public {
        vm.prank(admin);
        payout = new MassPayout(admin);
        usdt = new MockUSDT();

        usdt.faucet(payer, 10_000_000e6);
        // Native BNB sends use vm.deal so no ERC20 mock needed.
    }

    function test_SendERC20MassPayout() public {
        address[] memory recipients = new address[](3);
        recipients[0] = address(0x1);
        recipients[1] = address(0x2);
        recipients[2] = address(0x3);

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100e6;
        amounts[1] = 200e6;
        amounts[2] = 300e6;

        vm.startPrank(payer);
        usdt.approve(address(payout), 600e6);
        payout.sendERC20(IERC20(address(usdt)), recipients, amounts, "supabase://batch/1");
        vm.stopPrank();

        assertEq(usdt.balanceOf(recipients[0]), 100e6);
        assertEq(usdt.balanceOf(recipients[1]), 200e6);
        assertEq(usdt.balanceOf(recipients[2]), 300e6);
    }

    function test_DemoFaucetMintsThousandTokens() public {
        address claimer = address(0xFACE7);
        vm.prank(claimer);
        uint256 minted = usdt.demoFaucet();

        uint256 expected = 1_000e6;
        assertEq(minted, expected);
        assertEq(usdt.balanceOf(claimer), expected);
    }

    function test_SendNativeMassPayout() public {
        address payable[] memory recipients = new address payable[](2);
        recipients[0] = payable(address(0x10));
        recipients[1] = payable(address(0x11));

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1 ether;
        amounts[1] = 2 ether;

        vm.deal(payer, 10 ether);
        vm.prank(payer);
        payout.sendNative{value: 4 ether}(recipients, amounts, "native-batch");

        assertEq(recipients[0].balance, 1 ether);
        assertEq(recipients[1].balance, 2 ether);
        assertEq(payer.balance, 10 ether - 3 ether); // 1 ether refund
    }

    function test_SendERC20RevertsOnZeroRecipient() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.startPrank(payer);
        usdt.approve(address(payout), 1);
        vm.expectRevert(MassPayout.InvalidInput.selector);
        payout.sendERC20(IERC20(address(usdt)), recipients, amounts, "");
        vm.stopPrank();
    }

    function test_SendNativeRevertsOnZeroAmount() public {
        address payable[] memory recipients = new address payable[](1);
        recipients[0] = payable(address(0x1));

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0;

        vm.deal(payer, 1 ether);
        vm.prank(payer);
        vm.expectRevert(MassPayout.InvalidInput.selector);
        payout.sendNative{value: 1 ether}(recipients, amounts, "");
    }

    function test_RevertWhenLengthMismatch() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x1);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1;
        amounts[1] = 2;

        vm.expectRevert(MassPayout.InvalidInput.selector);
        payout.sendERC20(IERC20(address(usdt)), recipients, amounts, "");
    }

    function test_EstimateTotalSumsArray() public view {
        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1;
        amounts[1] = 5;
        amounts[2] = 9;

        uint256 total = payout.estimateTotal(amounts);
        assertEq(total, 15);
    }

    function test_RevertWhenInsufficientNativeValue() public {
        address payable[] memory recipients = new address payable[](1);
        recipients[0] = payable(address(0x1));

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1 ether;

        vm.deal(payer, 0.4 ether);
        vm.prank(payer);
        vm.expectRevert(MassPayout.InsufficientValue.selector);
        payout.sendNative{value: 0.4 ether}(recipients, amounts, "");
    }

    function test_ScheduleAndExecuteERC20() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0x41);
        recipients[1] = address(0x42);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 150e6;
        amounts[1] = 250e6;

        vm.startPrank(payer);
        usdt.approve(address(payout), 400e6);
        bytes32 scheduleId = payout.scheduleERC20(
            IERC20(address(usdt)),
            recipients,
            amounts,
            "scheduled-usdt",
            block.timestamp + 1 hours
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 1 hours + 1);
        payout.executeScheduled(scheduleId, recipients, amounts);

        assertEq(usdt.balanceOf(recipients[0]), 150e6);
        assertEq(usdt.balanceOf(recipients[1]), 250e6);
    }

    function test_ScheduleAndExecuteNative() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0x51);
        recipients[1] = address(0x52);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1 ether;
        amounts[1] = 0.5 ether;

        vm.deal(payer, 5 ether);
        vm.prank(payer);
        bytes32 scheduleId = payout.scheduleNative{value: 1.5 ether}(
            recipients,
            amounts,
            "native-scheduled",
            block.timestamp + 2 hours
        );

        vm.warp(block.timestamp + 2 hours + 5);
        payout.executeScheduled(scheduleId, recipients, amounts);

        assertEq(recipients[0].balance, 1 ether);
        assertEq(recipients[1].balance, 0.5 ether);
        assertEq(address(payout).balance, 0);
    }

    function test_ScheduleERC20RevertsWhenExecuteAfterPast() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x71);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 50e6;

        vm.startPrank(payer);
        usdt.approve(address(payout), 50e6);
        vm.expectRevert(MassPayout.ScheduleNotReady.selector);
        payout.scheduleERC20(IERC20(address(usdt)), recipients, amounts, "late", block.timestamp);
        vm.stopPrank();
    }

    function test_ScheduleNativeRevertsWhenExecuteAfterPast() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x81);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1 ether;

        vm.deal(payer, 1 ether);
        vm.prank(payer);
        vm.expectRevert(MassPayout.ScheduleNotReady.selector);
        payout.scheduleNative{value: 1 ether}(recipients, amounts, "late-native", block.timestamp);
    }

    function test_ScheduleNativeRevertsWhenValueMismatch() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x82);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 2 ether;

        vm.deal(payer, 5 ether);
        vm.prank(payer);
        vm.expectRevert(MassPayout.InsufficientValue.selector);
        payout.scheduleNative{value: 1 ether}(recipients, amounts, "undervalue", block.timestamp + 1);
    }

    function test_ScheduleERC20RevertsOnDuplicateParameters() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x91);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10e6;

        vm.warp(10_000);
        uint256 executeAfter = block.timestamp + 10;

        vm.startPrank(payer);
        usdt.approve(address(payout), 20e6);
        payout.scheduleERC20(IERC20(address(usdt)), recipients, amounts, "dup", executeAfter);
        vm.expectRevert(MassPayout.ScheduleExists.selector);
        payout.scheduleERC20(IERC20(address(usdt)), recipients, amounts, "dup", executeAfter);
        vm.stopPrank();
    }

    function test_ExecuteScheduledRevertsWhenMissing() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0xA1);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1;

        vm.expectRevert(MassPayout.ScheduleNotFound.selector);
        payout.executeScheduled(bytes32(uint256(1)), recipients, amounts);
    }

    function test_ExecuteScheduledRevertsWhenNotReady() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0xB1);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100e6;

        vm.startPrank(payer);
        usdt.approve(address(payout), 100e6);
        bytes32 scheduleId = payout.scheduleERC20(
            IERC20(address(usdt)),
            recipients,
            amounts,
            "not-ready",
            block.timestamp + 100
        );
        vm.stopPrank();

        vm.expectRevert(MassPayout.ScheduleNotReady.selector);
        payout.executeScheduled(scheduleId, recipients, amounts);
    }

    function test_ExecuteScheduledRevertsWhenAlreadyExecuted() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0xB2);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 5 ether;

        vm.deal(payer, 5 ether);
        vm.prank(payer);
        bytes32 scheduleId = payout.scheduleNative{value: 5 ether}(
            recipients,
            amounts,
            "done",
            block.timestamp + 1
        );

        vm.warp(block.timestamp + 2);
        payout.executeScheduled(scheduleId, recipients, amounts);

        vm.expectRevert(MassPayout.ScheduleAlreadyExecuted.selector);
        payout.executeScheduled(scheduleId, recipients, amounts);
    }

    function test_ExecuteScheduledRevertsWhenRecipientMismatch() public {
        address[] memory recipients = new address[](2);
        recipients[0] = address(0xC1);
        recipients[1] = address(0xC2);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10e6;
        amounts[1] = 15e6;

        vm.startPrank(payer);
        usdt.approve(address(payout), 25e6);
        bytes32 scheduleId = payout.scheduleERC20(
            IERC20(address(usdt)),
            recipients,
            amounts,
            "mismatch",
            block.timestamp + 5
        );
        vm.stopPrank();

        vm.warp(block.timestamp + 6);
        amounts[1] = 20e6;
        vm.expectRevert(MassPayout.InvalidInput.selector);
        payout.executeScheduled(scheduleId, recipients, amounts);
    }

    function test_CancelScheduleRefunds() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0x60);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 0.8 ether;

        vm.deal(payer, 2 ether);
        vm.prank(payer);
        bytes32 scheduleId = payout.scheduleNative{value: 0.8 ether}(
            recipients,
            amounts,
            "cancel-me",
            block.timestamp + 1 days
        );

        vm.prank(payer);
        payout.cancelScheduled(scheduleId);

        assertEq(address(payout).balance, 0);
    }

    function test_CancelScheduleRevertsWhenNotCreator() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0xD1);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 1 ether;

        vm.deal(payer, 1 ether);
        vm.prank(payer);
        bytes32 scheduleId = payout.scheduleNative{value: 1 ether}(
            recipients,
            amounts,
            "only-creator",
            block.timestamp + 1 days
        );

        vm.prank(address(0xD2));
        vm.expectRevert(MassPayout.ScheduleCallerNotCreator.selector);
        payout.cancelScheduled(scheduleId);
    }

    function test_CancelScheduleRevertsWhenAlreadyExecuted() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(0xE1);

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 2 ether;

        vm.deal(payer, 2 ether);
        vm.prank(payer);
        bytes32 scheduleId = payout.scheduleNative{value: 2 ether}(
            recipients,
            amounts,
            "cancel-fail",
            block.timestamp + 1 hours
        );

        vm.warp(block.timestamp + 1 hours + 1);
        payout.executeScheduled(scheduleId, recipients, amounts);

        vm.prank(payer);
        vm.expectRevert(MassPayout.ScheduleAlreadyExecuted.selector);
        payout.cancelScheduled(scheduleId);
    }
}
