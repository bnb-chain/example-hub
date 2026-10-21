// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./SocialVault.sol";

contract VaultFactory {
    event VaultCreated(address indexed vault, address indexed owner);

    function createVault(
        address[] memory _guardians,
        uint256 _threshold
    ) external returns (address) {
        SocialVault newVault = new SocialVault(
            msg.sender,
            _guardians,
            _threshold
        );
        emit VaultCreated(address(newVault), msg.sender);
        return address(newVault);
    }
}
