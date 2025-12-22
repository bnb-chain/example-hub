// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ERC20.sol";

contract MockToken is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1000 * 10 ** 18; // 1000 tokens

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol, 18) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /// @notice Faucet function for testing - mints 1000 tokens to caller
    /// @dev Only for hackathon/testnet use - not production ready
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }
}
