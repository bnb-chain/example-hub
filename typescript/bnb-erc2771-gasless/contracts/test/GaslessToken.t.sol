// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GaslessToken.sol";
import "../src/Forwarder.sol";

contract GaslessTokenTest is Test {
    GaslessToken public token;
    Forwarder public forwarder;

    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy forwarder and token
        forwarder = new Forwarder();
        token = new GaslessToken(address(forwarder));
    }

    function test_InitialState() public {
        assertEq(token.name(), "Gasless Token");
        assertEq(token.symbol(), "GAS");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1000000 * 10 ** 18);
        assertEq(token.balanceOf(address(this)), 1000000 * 10 ** 18);
    }

    function test_Transfer() public {
        uint256 amount = 500 * 10 ** 18;

        // Transfer from owner to user1
        token.transfer(user1, amount);

        assertEq(token.balanceOf(owner), token.totalSupply() - amount);
        assertEq(token.balanceOf(user1), amount);
    }

    function test_Transfer_InsufficientBalance() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        token.transfer(user2, 1 * 10 ** 18);
    }

    function test_Approve() public {
        uint256 amount = 1000 * 10 ** 18;

        vm.prank(user1);
        token.approve(user2, amount);

        assertEq(token.allowance(user1, user2), amount);
    }

    function test_TransferFrom() public {
        uint256 amount = 500 * 10 ** 18;

        // Owner approves user1
        token.approve(user1, amount);

        // User1 transfers from owner to user2
        vm.prank(user1);
        token.transferFrom(owner, user2, amount);

        assertEq(token.balanceOf(user2), amount);
        assertEq(token.allowance(owner, user1), 0);
    }

    function test_TransferFrom_InsufficientAllowance() public {
        uint256 amount = 500 * 10 ** 18;

        // No approval given
        vm.prank(user1);
        vm.expectRevert("Insufficient allowance");
        token.transferFrom(owner, user2, amount);
    }

    function test_GaslessTransfer_ViaForwarder() public {
        // Create user1 with known private key first
        uint256 user1PrivateKey = 0x1234;
        address testUser = vm.addr(user1PrivateKey);

        // Give testUser some tokens via regular transfer
        token.transfer(testUser, 1000 * 10 ** 18);

        uint256 user1BalanceBefore = token.balanceOf(testUser);
        uint256 user2BalanceBefore = token.balanceOf(user2);
        uint256 transferAmount = 100 * 10 ** 18;

        // Prepare gasless transfer from testUser to user2
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            user2,
            transferAmount
        );

        // Create forward request (simulating what would happen off-chain)
        Forwarder.ForwardRequest memory req = Forwarder.ForwardRequest({
            from: testUser,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: forwarder.getNonce(testUser),
            data: transferData
        });

        bytes32 digest = _getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(user1PrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Relayer (this contract) executes the forward
        (bool success, ) = forwarder.execute(req, signature);

        assertTrue(success);
        assertEq(
            token.balanceOf(testUser),
            user1BalanceBefore - transferAmount
        );
        assertEq(token.balanceOf(user2), user2BalanceBefore + transferAmount);
    }

    function test_TrustedForwarder() public {
        assertTrue(token.isTrustedForwarder(address(forwarder)));
        assertFalse(token.isTrustedForwarder(address(this)));
        assertFalse(token.isTrustedForwarder(user1));
    }

    // Helper function to compute EIP-712 digest
    function _getDigest(
        Forwarder.ForwardRequest memory req
    ) internal view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256(
                    "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
                ),
                req.from,
                req.to,
                req.value,
                req.gas,
                req.nonce,
                keccak256(req.data)
            )
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("Forwarder"),
                keccak256("1"),
                block.chainid,
                address(forwarder)
            )
        );

        return
            keccak256(
                abi.encodePacked("\x19\x01", domainSeparator, structHash)
            );
    }
}
