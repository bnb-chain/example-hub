// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "openzeppelin-contracts/contracts/utils/Address.sol";

/**
 * @title MassPayout
 * @notice Automates large scale fund distributions for both ERC20 tokens and native BNB.
 */
contract MassPayout is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Emitted whenever a payout is sent.
    event PayoutExecuted(
        bytes32 indexed batchId,
        address indexed asset,
        uint256 totalAmount,
        uint256 totalRecipients,
        address indexed payer,
        PayoutType payoutType,
        string metadataURI
    );

    /// @notice Stored information for a scheduled payout.
    struct ScheduledBatch {
        address creator;
        address asset;
        bool isNative;
        uint64 executeAfter;
        uint64 createdAt;
        uint256 totalAmount;
        uint256 recipientsCount;
        bytes32 recipientsHash;
        bool executed;
        string metadataURI;
    }

    /// @notice Type of payout performed.
    enum PayoutType {
        ERC20,
        NATIVE
    }

    error InvalidInput();
    error InsufficientValue();
    error ScheduleNotFound();
    error ScheduleNotReady();
    error ScheduleAlreadyExecuted();
    error ScheduleCallerNotCreator();
    error ScheduleExists();

    mapping(bytes32 => ScheduledBatch) public scheduledBatches;

    event ScheduledPayoutCreated(
        bytes32 indexed scheduleId,
        address indexed creator,
        address indexed asset,
        uint256 totalAmount,
        uint64 executeAfter,
        bool isNative,
        string metadataURI
    );

    event ScheduledPayoutExecuted(bytes32 indexed scheduleId, address indexed executor);
    event ScheduledPayoutCancelled(bytes32 indexed scheduleId);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Distribute ERC20 tokens in bulk. Requires allowance for this contract.
     * @param token ERC20 token address.
     * @param recipients List of payout recipients.
     * @param amounts Corresponding token amounts.
     * @param metadataURI Optional metadata (IPFS/Supabase identifier).
     */
    function sendERC20(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata metadataURI
    ) external returns (bytes32 batchId) {
        uint256 length = recipients.length;
        if (length == 0 || length != amounts.length) revert InvalidInput();

        uint256 total;
        for (uint256 i; i < length; ++i) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];
            if (recipient == address(0) || amount == 0) revert InvalidInput();
            total += amount;
            token.safeTransferFrom(msg.sender, recipient, amount);
        }

        batchId = _emitBatch(address(token), total, length, PayoutType.ERC20, metadataURI);
    }

    /**
     * @notice Distribute native value (BNB) to many recipients in one transaction.
     * @param recipients List of payout recipients.
     * @param amounts Corresponding native amounts.
     * @param metadataURI Optional metadata (IPFS/Supabase identifier).
     */
    function sendNative(
        address payable[] calldata recipients,
        uint256[] calldata amounts,
        string calldata metadataURI
    ) external payable returns (bytes32 batchId) {
        uint256 length = recipients.length;
        if (length == 0 || length != amounts.length) revert InvalidInput();

        uint256 total;
        for (uint256 i; i < length; ++i) {
            address payable recipient = recipients[i];
            uint256 amount = amounts[i];
            if (recipient == address(0) || amount == 0) revert InvalidInput();
            total += amount;
        }

        if (msg.value < total) revert InsufficientValue();

        for (uint256 i; i < length; ++i) {
            Address.sendValue(recipients[i], amounts[i]);
        }

        uint256 refund = msg.value - total;
        if (refund > 0) {
            Address.sendValue(payable(msg.sender), refund);
        }

        batchId = _emitBatch(address(0), total, length, PayoutType.NATIVE, metadataURI);
    }

    /**
     * @notice Helper to calculate the total amount of a payout client side.
     */
    function estimateTotal(uint256[] calldata amounts) external pure returns (uint256 total) {
        uint256 length = amounts.length;
        for (uint256 i; i < length; ++i) {
            total += amounts[i];
        }
    }

    /**
     * @notice Queue an ERC20 payout that will execute automatically after `executeAfter`.
     */
    function scheduleERC20(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata metadataURI,
        uint256 executeAfter
    ) external returns (bytes32 scheduleId) {
        if (executeAfter <= block.timestamp) revert ScheduleNotReady();
        (uint256 total, bytes32 hash) = _validateSchedule(recipients, amounts);

        token.safeTransferFrom(msg.sender, address(this), total);

        scheduleId = _storeSchedule(
            msg.sender,
            address(token),
            false,
            total,
            executeAfter,
            recipients.length,
            hash,
            metadataURI
        );
    }

    /**
     * @notice Queue a native BNB payout that will execute automatically after `executeAfter`.
     */
    function scheduleNative(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata metadataURI,
        uint256 executeAfter
    ) external payable returns (bytes32 scheduleId) {
        if (executeAfter <= block.timestamp) revert ScheduleNotReady();
        (uint256 total, bytes32 hash) = _validateSchedule(recipients, amounts);
        if (msg.value != total) revert InsufficientValue();

        scheduleId = _storeSchedule(
            msg.sender,
            address(0),
            true,
            total,
            executeAfter,
            recipients.length,
            hash,
            metadataURI
        );
    }

    /**
     * @notice Execute a scheduled payout once it is unlocked.
     */
    function executeScheduled(
        bytes32 scheduleId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        ScheduledBatch storage batch = scheduledBatches[scheduleId];
        if (batch.creator == address(0)) revert ScheduleNotFound();
        if (batch.executed) revert ScheduleAlreadyExecuted();
        if (block.timestamp < batch.executeAfter) revert ScheduleNotReady();
        if (recipients.length != batch.recipientsCount || amounts.length != batch.recipientsCount) {
            revert InvalidInput();
        }

        (uint256 total, bytes32 hash) = _validateSchedule(recipients, amounts);
        if (hash != batch.recipientsHash || total != batch.totalAmount) revert InvalidInput();

        batch.executed = true;

        if (batch.isNative) {
            for (uint256 i; i < recipients.length; ++i) {
                Address.sendValue(payable(recipients[i]), amounts[i]);
            }
        } else {
            IERC20 token = IERC20(batch.asset);
            for (uint256 i; i < recipients.length; ++i) {
                token.safeTransfer(recipients[i], amounts[i]);
            }
        }

        emit ScheduledPayoutExecuted(scheduleId, msg.sender);
        emit PayoutExecuted(
            scheduleId,
            batch.asset,
            batch.totalAmount,
            batch.recipientsCount,
            batch.creator,
            batch.isNative ? PayoutType.NATIVE : PayoutType.ERC20,
            batch.metadataURI
        );
    }

    /**
     * @notice Cancel a pending scheduled payout and refund the locked funds.
     */
    function cancelScheduled(bytes32 scheduleId) external {
        ScheduledBatch storage batch = scheduledBatches[scheduleId];
        if (batch.creator == address(0)) revert ScheduleNotFound();
        if (batch.executed) revert ScheduleAlreadyExecuted();
        if (msg.sender != batch.creator) revert ScheduleCallerNotCreator();

        batch.executed = true;
        uint256 refundAmount = batch.totalAmount;
        address asset = batch.asset;
        bool isNative = batch.isNative;
        delete scheduledBatches[scheduleId];

        if (isNative) {
            Address.sendValue(payable(msg.sender), refundAmount);
        } else {
            IERC20(asset).safeTransfer(msg.sender, refundAmount);
        }

        emit ScheduledPayoutCancelled(scheduleId);
    }

    function _emitBatch(
        address asset,
        uint256 total,
        uint256 recipients,
        PayoutType payoutType,
        string calldata metadataURI
    ) private returns (bytes32 batchId) {
        batchId = keccak256(
            abi.encodePacked(blockhash(block.number - 1), msg.sender, asset, total, metadataURI, block.timestamp)
        );
        emit PayoutExecuted(batchId, asset, total, recipients, msg.sender, payoutType, metadataURI);
    }

    function _validateSchedule(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) private pure returns (uint256 total, bytes32 hash) {
        uint256 length = recipients.length;
        if (length == 0 || length != amounts.length) revert InvalidInput();

        for (uint256 i; i < length; ++i) {
            address recipient = recipients[i];
            uint256 amount = amounts[i];
            if (recipient == address(0) || amount == 0) revert InvalidInput();
            total += amount;
        }

        hash = keccak256(abi.encode(recipients, amounts));
    }

    function _storeSchedule(
        address creator,
        address asset,
        bool isNative,
        uint256 total,
        uint256 executeAfter,
        uint256 recipientsCount,
        bytes32 recipientsHash,
        string calldata metadataURI
    ) private returns (bytes32 scheduleId) {
        scheduleId = keccak256(
            abi.encode(creator, address(this), asset, recipientsHash, executeAfter, metadataURI, block.timestamp)
        );
        if (scheduledBatches[scheduleId].creator != address(0)) revert ScheduleExists();

        scheduledBatches[scheduleId] = ScheduledBatch({
            creator: creator,
            asset: asset,
            isNative: isNative,
            executeAfter: uint64(executeAfter),
            createdAt: uint64(block.timestamp),
            totalAmount: total,
            recipientsCount: recipientsCount,
            recipientsHash: recipientsHash,
            executed: false,
            metadataURI: metadataURI
        });

        emit ScheduledPayoutCreated(
            scheduleId,
            creator,
            asset,
            total,
            uint64(executeAfter),
            isNative,
            metadataURI
        );
    }
}
