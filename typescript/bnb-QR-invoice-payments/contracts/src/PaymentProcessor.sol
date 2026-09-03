// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/// @notice ERC20 subset used by the payment processor.
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);
}

contract PaymentProcessor {
    enum PaymentStatus {
        None,
        Settled
    }

    struct Merchant {
        address payoutAddress;
        bool active;
        uint256 nonce;
    }

    struct Payment {
        address payer;
        address merchant;
        uint256 amount;
        uint256 timestamp;
        PaymentStatus status;
        string memo;
    }

    IERC20 public immutable stablecoin;

    mapping(address => Merchant) public merchants;
    mapping(bytes32 => Payment) public payments;

    event MerchantRegistered(address indexed merchant, address indexed payoutAddress);
    event MerchantUpdated(address indexed merchant, address indexed payoutAddress);
    event PaymentSettled(
        bytes32 indexed invoiceId,
        address indexed payer,
        address indexed merchant,
        uint256 amount,
        string memo
    );

    constructor(IERC20 _stablecoin) {
        require(address(_stablecoin) != address(0), "stablecoin required");
        stablecoin = _stablecoin;
    }

    function registerMerchant(address payoutAddress) external {
        require(payoutAddress != address(0), "payout required");
        Merchant storage merchant = merchants[msg.sender];
        merchant.payoutAddress = payoutAddress;
        merchant.active = true;
        emit MerchantRegistered(msg.sender, payoutAddress);
    }

    function updatePayout(address newPayout) external {
        Merchant storage merchant = merchants[msg.sender];
        require(merchant.active, "merchant missing");
        require(newPayout != address(0), "payout required");
        merchant.payoutAddress = newPayout;
        emit MerchantUpdated(msg.sender, newPayout);
    }

    function merchantNonce(address merchant) external view returns (uint256) {
        return merchants[merchant].nonce;
    }

    function computeInvoiceId(
        address merchant,
        uint256 amount,
        string calldata memo,
        uint256 nonce
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(merchant, amount, memo, nonce));
    }

    function pay(address merchant, uint256 amount, string calldata memo, bytes32 invoiceId) external {
        Merchant storage merchantInfo = merchants[merchant];
        require(merchantInfo.active, "merchant missing");
        require(amount > 0, "amount zero");
        require(invoiceId != bytes32(0), "invoice id missing");
        require(payments[invoiceId].status == PaymentStatus.None, "invoice used");

        address payout = merchantInfo.payoutAddress;
        require(payout != address(0), "payout missing");

        payments[invoiceId] = Payment({
            payer: msg.sender,
            merchant: merchant,
            amount: amount,
            timestamp: block.timestamp,
            status: PaymentStatus.Settled,
            memo: memo
        });

        merchantInfo.nonce += 1;

        require(stablecoin.transferFrom(msg.sender, payout, amount), "transfer failed");

        emit PaymentSettled(invoiceId, msg.sender, merchant, amount, memo);
    }

    function paymentStatus(bytes32 invoiceId) external view returns (PaymentStatus) {
        return payments[invoiceId].status;
    }

    function paymentDetails(bytes32 invoiceId) external view returns (Payment memory) {
        Payment memory payment = payments[invoiceId];
        require(payment.status != PaymentStatus.None, "invoice not found");
        return payment;
    }
}
