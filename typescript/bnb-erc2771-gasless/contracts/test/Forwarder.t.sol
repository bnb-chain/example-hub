// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Forwarder.sol";
import "../src/GaslessToken.sol";

contract ForwarderTest is Test {
    Forwarder public forwarder;
    GaslessToken public token;

    address public user;
    uint256 public userPrivateKey;
    address public relayer;
    address public recipient;

    function setUp() public {
        // Deploy forwarder
        forwarder = new Forwarder();

        // Deploy token with forwarder as trusted forwarder
        token = new GaslessToken(address(forwarder));

        // Set up test accounts
        userPrivateKey = 0xA11CE;
        user = vm.addr(userPrivateKey);
        relayer = makeAddr("relayer");
        recipient = makeAddr("recipient");

        // Give relayer some ETH for gas
        vm.deal(relayer, 10 ether);

        // Give user some tokens
        vm.prank(address(this));
        token.transfer(user, 1000 * 10 ** 18);
    }

    function test_GetNonce() public {
        assertEq(forwarder.getNonce(user), 0);
        assertEq(forwarder.getNonce(relayer), 0);
    }

    function test_ForwardTransfer_Success() public {
        uint256 transferAmount = 100 * 10 ** 18;
        uint256 userBalanceBefore = token.balanceOf(user);
        uint256 recipientBalanceBefore = token.balanceOf(recipient);

        // Prepare the transfer calldata
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            recipient,
            transferAmount
        );

        // Create forward request
        Forwarder.ForwardRequest memory req = Forwarder.ForwardRequest({
            from: user,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: forwarder.getNonce(user),
            data: transferData
        });

        // Sign the request
        bytes32 digest = _getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Relayer executes the forward request
        vm.prank(relayer);
        (bool success, ) = forwarder.execute(req, signature);

        assertTrue(success, "Forward should succeed");
        assertEq(token.balanceOf(user), userBalanceBefore - transferAmount);
        assertEq(
            token.balanceOf(recipient),
            recipientBalanceBefore + transferAmount
        );
        assertEq(forwarder.getNonce(user), 1, "Nonce should increment");
    }

    function test_ForwardTransfer_InvalidSignature() public {
        uint256 transferAmount = 100 * 10 ** 18;

        // Prepare the transfer calldata
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            recipient,
            transferAmount
        );

        // Create forward request
        Forwarder.ForwardRequest memory req = Forwarder.ForwardRequest({
            from: user,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: forwarder.getNonce(user),
            data: transferData
        });

        // Sign with wrong private key
        uint256 wrongPrivateKey = 0xBAD;
        bytes32 digest = _getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Expect revert due to invalid signature
        vm.prank(relayer);
        vm.expectRevert("Forwarder: signature does not match request");
        forwarder.execute(req, signature);
    }

    function test_ForwardTransfer_InvalidNonce() public {
        uint256 transferAmount = 100 * 10 ** 18;

        // Prepare the transfer calldata
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            recipient,
            transferAmount
        );

        // Create forward request with wrong nonce
        Forwarder.ForwardRequest memory req = Forwarder.ForwardRequest({
            from: user,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: 999, // Wrong nonce
            data: transferData
        });

        // Sign the request
        bytes32 digest = _getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Expect revert due to invalid nonce
        vm.prank(relayer);
        vm.expectRevert("Forwarder: invalid nonce");
        forwarder.execute(req, signature);
    }

    function test_ForwardTransfer_ReplayProtection() public {
        uint256 transferAmount = 50 * 10 ** 18;

        // Prepare the transfer calldata
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            recipient,
            transferAmount
        );

        // Create forward request
        Forwarder.ForwardRequest memory req = Forwarder.ForwardRequest({
            from: user,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: forwarder.getNonce(user),
            data: transferData
        });

        // Sign the request
        bytes32 digest = _getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First execution should succeed
        vm.prank(relayer);
        (bool success, ) = forwarder.execute(req, signature);
        assertTrue(success);

        // Second execution with same signature should fail (nonce already used)
        vm.prank(relayer);
        vm.expectRevert("Forwarder: invalid nonce");
        forwarder.execute(req, signature);
    }

    function test_Verify() public {
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            recipient,
            100 * 10 ** 18
        );

        Forwarder.ForwardRequest memory req = Forwarder.ForwardRequest({
            from: user,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: forwarder.getNonce(user),
            data: transferData
        });

        // Valid signature
        bytes32 digest = _getDigest(req);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory validSignature = abi.encodePacked(r, s, v);

        assertTrue(
            forwarder.verify(req, validSignature),
            "Valid signature should verify"
        );

        // Invalid signature
        (v, r, s) = vm.sign(0xBAD, digest);
        bytes memory invalidSignature = abi.encodePacked(r, s, v);

        assertFalse(
            forwarder.verify(req, invalidSignature),
            "Invalid signature should not verify"
        );
    }

    function test_MultipleUsersSeparateNonces() public {
        // Create second user
        uint256 user2PrivateKey = 0xBEEF;
        address user2 = vm.addr(user2PrivateKey);

        // Give second user some tokens
        vm.prank(address(this));
        token.transfer(user2, 500 * 10 ** 18);

        // Both users should start with nonce 0
        assertEq(forwarder.getNonce(user), 0);
        assertEq(forwarder.getNonce(user2), 0);

        // User 1 makes a transaction
        bytes memory transferData = abi.encodeWithSelector(
            token.transfer.selector,
            recipient,
            50 * 10 ** 18
        );

        Forwarder.ForwardRequest memory req1 = Forwarder.ForwardRequest({
            from: user,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: 0,
            data: transferData
        });

        bytes32 digest1 = _getDigest(req1);
        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(userPrivateKey, digest1);
        bytes memory sig1 = abi.encodePacked(r1, s1, v1);

        vm.prank(relayer);
        forwarder.execute(req1, sig1);

        // User 1 nonce incremented, user 2 unchanged
        assertEq(forwarder.getNonce(user), 1);
        assertEq(forwarder.getNonce(user2), 0);

        // User 2 makes a transaction with nonce 0
        Forwarder.ForwardRequest memory req2 = Forwarder.ForwardRequest({
            from: user2,
            to: address(token),
            value: 0,
            gas: 100000,
            nonce: 0,
            data: transferData
        });

        bytes32 digest2 = _getDigest(req2);
        (uint8 v2, bytes32 r2, bytes32 s2) = vm.sign(user2PrivateKey, digest2);
        bytes memory sig2 = abi.encodePacked(r2, s2, v2);

        vm.prank(relayer);
        forwarder.execute(req2, sig2);

        // Both nonces incremented independently
        assertEq(forwarder.getNonce(user), 1);
        assertEq(forwarder.getNonce(user2), 1);
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
