// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title QrisPaymentVault
/// @notice Receives stablecoin payments on behalf of merchants and holds a
///         per-merchant balance. Settlement is triggered by the off-chain agent
///         after QRIS validation, identity, and policy checks pass.
/// @dev    This is a real on-chain contract (not a mock). It demonstrates the
///         settlement seam in the Web2.5 agentic payment flow.
contract QrisPaymentVault is Ownable {
    using SafeERC20 for IERC20;

    /// @notice ERC20 token this vault accepts (e.g. BUSD)
    IERC20 public immutable token;

    /// @notice merchant address => balance in token base units
    mapping(address => uint256) public merchantBalance;

    /// @notice total volume settled through this vault
    uint256 public totalSettled;

    /// @notice counter for receipts issued
    uint256 public receiptCount;

    event PaymentSettled(
        address indexed payer,
        address indexed merchant,
        uint256 amount,
        bytes32 indexed receiptId,
        string qrisRef
    );

    event Withdrawal(address indexed merchant, uint256 amount);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    /// @notice Settle a QRIS payment on-chain.
    ///         Caller must have approved this contract to spend `amount` tokens.
    /// @param merchant  Destination address for the payment.
    /// @param amount     Token amount in base units (e.g. 1e18 = 1 BUSD).
    /// @param qrisRef    QRIS merchant code or reference string (for event log).
    /// @return receiptId Unique on-chain receipt identifier.
    function settle(
        address merchant,
        uint256 amount,
        string calldata qrisRef
    ) external returns (bytes32 receiptId) {
        require(merchant != address(0), "Invalid merchant");
        require(amount > 0, "Amount must be > 0");

        // Transfer tokens from payer to this vault, then credit merchant.
        token.safeTransferFrom(msg.sender, address(this), amount);
        merchantBalance[merchant] += amount;
        totalSettled += amount;
        receiptCount += 1;

        // Deterministic receipt ID: keccak(vault, receiptCount, block.number)
        receiptId = keccak256(
            abi.encodePacked(address(this), receiptCount, block.number)
        );

        emit PaymentSettled(msg.sender, merchant, amount, receiptId, qrisRef);
    }

    /// @notice Merchant withdraws their accumulated balance.
    function withdraw() external returns (uint256 amount) {
        amount = merchantBalance[msg.sender];
        require(amount > 0, "No balance to withdraw");
        merchantBalance[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    /// @notice Check a merchant's balance without modifying state.
    function balanceOf(address merchant) external view returns (uint256) {
        return merchantBalance[merchant];
    }
}
