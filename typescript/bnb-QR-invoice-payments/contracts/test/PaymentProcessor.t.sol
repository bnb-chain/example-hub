// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {Test} from "forge-std/Test.sol";
import {PaymentProcessor, IERC20} from "../src/PaymentProcessor.sol";
import {USDYMock} from "../src/USDYMock.sol";

contract PaymentProcessorTest is Test {
    USDYMock internal usdy;
    PaymentProcessor internal processor;

    address internal merchant = address(0xA11CE);
    address internal merchantPayout = address(0xA11CE1);
    address internal customer = address(0xBEEF);

    function setUp() public {
        usdy = new USDYMock(address(this), 0);
        processor = new PaymentProcessor(IERC20(address(usdy)));

        vm.prank(merchant);
        processor.registerMerchant(merchantPayout);

        usdy.mint(customer, 1_000e18);
        vm.prank(customer);
        usdy.approve(address(processor), type(uint256).max);
    }

    function testPaymentTransfersFundsAndMarksInvoice() public {
        bytes32 invoiceId = processor.computeInvoiceId(merchant, 100e18, "latte", 0);

        vm.prank(customer);
        processor.pay(merchant, 100e18, "latte", invoiceId);

        assertEq(usdy.balanceOf(merchantPayout), 100e18, "merchant should receive funds");

        (
            address payer,
            address merchantAddress,
            uint256 amount,
            uint256 timestamp,
            PaymentProcessor.PaymentStatus status,
            string memory memo
        ) = processor.payments(invoiceId);

        assertEq(payer, customer);
        assertEq(merchantAddress, merchant);
        assertEq(amount, 100e18);
        assertGt(timestamp, 0);
        assertEq(uint256(status), uint256(PaymentProcessor.PaymentStatus.Settled));
        assertEq(keccak256(bytes(memo)), keccak256(bytes("latte")));
    }

    function testCannotReuseInvoiceId() public {
        bytes32 invoiceId = processor.computeInvoiceId(merchant, 25e18, "tea", 0);

        vm.prank(customer);
        processor.pay(merchant, 25e18, "tea", invoiceId);

        vm.prank(customer);
        vm.expectRevert("invoice used");
        processor.pay(merchant, 25e18, "tea", invoiceId);
    }

    function testRevertsWhenMerchantMissing() public {
        bytes32 invoiceId = processor.computeInvoiceId(address(0x1234), 10e18, "test", 0);

        vm.prank(customer);
        vm.expectRevert("merchant missing");
        processor.pay(address(0x1234), 10e18, "test", invoiceId);
    }

    function testPaymentDetailsView() public {
        bytes32 invoiceId = processor.computeInvoiceId(merchant, 55e18, "sandwich", 0);

        vm.prank(customer);
        processor.pay(merchant, 55e18, "sandwich", invoiceId);

        PaymentProcessor.Payment memory info = processor.paymentDetails(invoiceId);
        assertEq(info.merchant, merchant);
        assertEq(info.payer, customer);
        assertEq(info.amount, 55e18);
        assertEq(uint256(info.status), uint256(PaymentProcessor.PaymentStatus.Settled));
        assertEq(keccak256(bytes(info.memo)), keccak256(bytes("sandwich")));

        vm.expectRevert("invoice not found");
        processor.paymentDetails(bytes32(uint256(123)));
    }
}
