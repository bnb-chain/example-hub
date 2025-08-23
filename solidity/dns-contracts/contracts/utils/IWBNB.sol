// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @dev Minimal WBNB interface (same as WETH9)
interface IWBNB {
    /// @notice Deposit native BNB and mint WBNB 1:1
    function deposit() external payable;
    /// @notice Burn WBNB and withdraw native BNB 1:1
    function withdraw(uint256 wad) external;
    /// @notice ERC20: total tokens in existence
    function totalSupply() external view returns (uint256);
    /// @notice ERC20: balance of `who`
    function balanceOf(address who) external view returns (uint256);
    /// @notice ERC20: transfer `wad` tokens to `to`
    function transfer(address to, uint256 wad) external returns (bool);
    /// @notice ERC20: allowance from `owner` to `spender`
    function allowance(address owner, address spender) external view returns (uint256);
    /// @notice ERC20: approve `spender` to spend up to `wad` tokens
    function approve(address spender, uint256 wad) external returns (bool);
    /// @notice ERC20: transfer `wad` tokens from `from` to `to`
    function transferFrom(
        address from,
        address to,
        uint256 wad
    ) external returns (bool);

    // Optional: some implementations also emit these
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value);
}
