// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title Forwarder
 * @dev Minimal forwarder contract for ERC-2771 meta-transactions.
 *
 * This contract allows relayers to submit transactions on behalf of users.
 * Users sign an EIP-712 typed message, and relayers pay the gas to execute it.
 */
contract Forwarder {
    struct ForwardRequest {
        address from; // User who signed the request
        address to; // Target contract to call
        uint256 value; // ETH value to send
        uint256 gas; // Gas limit for the call
        uint256 nonce; // Nonce for replay protection
        bytes data; // Calldata to execute
    }

    // Nonces for replay protection
    mapping(address => uint256) private _nonces;

    // EIP-712 domain separator
    bytes32 private immutable _CACHED_DOMAIN_SEPARATOR;
    bytes32 private immutable _HASHED_NAME;
    bytes32 private immutable _HASHED_VERSION;
    bytes32 private immutable _TYPE_HASH;

    // EIP-712 type hashes
    bytes32 private constant _FORWARD_REQUEST_TYPEHASH =
        keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)"
        );

    event TransactionForwarded(
        address indexed from,
        address indexed to,
        uint256 nonce,
        bool success,
        bytes returnData
    );

    constructor() {
        _HASHED_NAME = keccak256(bytes("Forwarder"));
        _HASHED_VERSION = keccak256(bytes("1"));
        _TYPE_HASH = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

        _CACHED_DOMAIN_SEPARATOR = _buildDomainSeparator();
    }

    /**
     * @dev Returns the current nonce for an address.
     */
    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    /**
     * @dev Verifies and executes a forward request.
     * @param req The forward request to execute
     * @param signature The EIP-712 signature from the user
     */
    function execute(
        ForwardRequest calldata req,
        bytes calldata signature
    ) public payable returns (bool success, bytes memory returnData) {
        // Verify the signature
        require(
            _verify(req, signature),
            "Forwarder: signature does not match request"
        );

        // Verify and increment nonce
        require(_nonces[req.from] == req.nonce, "Forwarder: invalid nonce");
        _nonces[req.from]++;

        // Execute the call
        // Append the real sender (req.from) to the calldata as per ERC-2771
        bytes memory data = abi.encodePacked(req.data, req.from);

        (success, returnData) = req.to.call{gas: req.gas, value: req.value}(
            data
        );

        // Emit event
        emit TransactionForwarded(
            req.from,
            req.to,
            req.nonce,
            success,
            returnData
        );

        // Optionally require success
        // For flexibility, we allow failed calls and let the relayer decide
        // require(success, "Forwarder: call failed");
    }

    /**
     * @dev Verifies that the signature matches the request.
     */
    function verify(
        ForwardRequest calldata req,
        bytes calldata signature
    ) public view returns (bool) {
        return _verify(req, signature);
    }

    function _verify(
        ForwardRequest calldata req,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 hash = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    _FORWARD_REQUEST_TYPEHASH,
                    req.from,
                    req.to,
                    req.value,
                    req.gas,
                    req.nonce,
                    keccak256(req.data)
                )
            )
        );

        // Extract r, s, v from signature
        require(signature.length == 65, "Forwarder: invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        address signer = ecrecover(hash, v, r, s);
        require(signer != address(0), "Forwarder: invalid signature");

        return signer == req.from;
    }

    /**
     * @dev Returns the domain separator for EIP-712.
     */
    function _domainSeparatorV4() internal view returns (bytes32) {
        return _CACHED_DOMAIN_SEPARATOR;
    }

    /**
     * @dev Builds the domain separator.
     */
    function _buildDomainSeparator() private view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    _TYPE_HASH,
                    _HASHED_NAME,
                    _HASHED_VERSION,
                    block.chainid,
                    address(this)
                )
            );
    }

    /**
     * @dev Returns the hash of the fully encoded EIP712 message.
     */
    function _hashTypedDataV4(
        bytes32 structHash
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash)
            );
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}
}
