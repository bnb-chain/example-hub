// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Context variant with ERC-2771 support.
 * 
 * ERC-2771 allows contracts to accept meta-transactions where the actual sender
 * is appended to the calldata by a trusted forwarder contract.
 */
abstract contract ERC2771Context {
    address private immutable _trustedForwarder;

    constructor(address trustedForwarder) {
        _trustedForwarder = trustedForwarder;
    }

    /**
     * @dev Returns true if the caller is the trusted forwarder.
     */
    function isTrustedForwarder(address forwarder) public view virtual returns (bool) {
        return forwarder == _trustedForwarder;
    }

    /**
     * @dev Returns the actual sender of the transaction.
     * If the caller is the trusted forwarder, extracts the real sender from calldata.
     * Otherwise, returns msg.sender.
     */
    function _msgSender() internal view virtual returns (address sender) {
        if (isTrustedForwarder(msg.sender)) {
            // The assembly code below extracts the sender address from the calldata.
            // In ERC-2771, the actual sender is appended as the last 20 bytes.
            assembly {
                sender := shr(96, calldataload(sub(calldatasize(), 20)))
            }
        } else {
            sender = msg.sender;
        }
    }

    /**
     * @dev Returns the actual calldata.
     * If called by the trusted forwarder, returns calldata minus the appended sender.
     */
    function _msgData() internal view virtual returns (bytes calldata) {
        if (isTrustedForwarder(msg.sender)) {
            return msg.data[:msg.data.length - 20];
        } else {
            return msg.data;
        }
    }
}
