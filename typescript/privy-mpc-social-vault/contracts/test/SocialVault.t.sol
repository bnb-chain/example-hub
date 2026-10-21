// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/SocialVault.sol";

contract SocialVaultTest is Test {
    SocialVault vault;
    address owner = address(1);
    address member = address(2);
    address guardian69 = address(3);
    address guardian2 = address(4);

    function setUp() public {
        address[] memory guardians = new address[](2);
        guardians[0] = guardian69;
        guardians[1] = guardian2;

        vm.prank(owner);
        vault = new SocialVault(owner, guardians, 2);

        // Fund the vault
        vm.deal(address(vault), 10 ether);
    }

    function testOwnerCanWithdraw() public {
        vm.prank(owner);
        vault.withdraw(payable(owner), 1 ether);
        assertEq(address(vault).balance, 9 ether);
    }

    function testMemberCannotWithdrawWithoutAdd() public {
        vm.prank(member);
        vm.expectRevert("Not authorized");
        vault.withdraw(payable(member), 1 ether);
    }

    function testMemberDailyLimit() public {
        vm.prank(owner);
        vault.addMember(member, 1 ether); // 1 ETH limit

        vm.startPrank(member);
        vault.withdraw(payable(member), 0.5 ether);
        assertEq(address(vault).balance, 9.5 ether);

        vm.expectRevert("Daily limit exceeded");
        vault.withdraw(payable(member), 0.6 ether); // 0.5 + 0.6 > 1.0
        vm.stopPrank();
    }

    function testRecovery() public {
        address newOwner = address(5);

        // Guardian 1 votes
        vm.prank(guardian69);
        vault.initiateRecovery(newOwner);
        assertEq(vault.owner(), owner); // Not yet

        // Guardian 2 votes
        vm.prank(guardian2);
        vault.initiateRecovery(newOwner);

        assertEq(vault.owner(), newOwner); // Recovered!
    }
}
