// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/token/ERC721/ERC721.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/access/Ownable.sol";
import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v5.0.1/contracts/token/ERC721/IERC721.sol";

// Custom Errors
error RecipientAlreadyHasBadge(address recipient);
error TransferNotAllowed();

// Event for specific tracking -- MOVED INSIDE CONTRACT
// event BadgeMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);

/**
 * @title ReputationBadge
 * @dev An ERC721 contract for minting soulbound reputation badges.
 * Badges are non-transferable and can only be minted by the contract owner.
 * Metadata URI is set upon minting.
 * Uses custom errors and emits a specific BadgeMinted event.
 */
contract ReputationBadge is ERC721, ERC721URIStorage, Ownable {
    // Event for specific tracking
    event BadgeMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);

    // Use a simple counter state variable, starting from 1
    uint256 private _nextTokenId = 1;

    // Mapping from address to token ID to check if a badge exists
    mapping(address => uint256) private _addressToTokenId;
    // Mapping from token ID to existence (needed because _addressToTokenId maps to 0 by default)
    mapping(uint256 => bool) private _tokenIdExists;

    /**
     * @dev Constructor initializes the ERC721 token and Ownable owner.
     * @param initialOwner The address that will initially own the contract.
     */
    constructor(address initialOwner) ERC721("ReputationBadge", "REPB") Ownable(initialOwner) {}

    /**
     * @dev Mints a new badge to the specified address with the given token URI.
     * Can only be called by the contract owner.
     * Reverts if the recipient already has a badge.
     * Emits {Transfer} and {BadgeMinted} events.
     * @param to The address to mint the badge to.
     * @param uri The metadata URI for the badge.
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        if (hasBadge(to)) {
            revert RecipientAlreadyHasBadge(to);
        }

        uint256 tokenId = _nextTokenId;
        _safeMint(to, tokenId); // Emits Transfer event
        _setTokenURI(tokenId, uri);

        _addressToTokenId[to] = tokenId;
        _tokenIdExists[tokenId] = true;

        _nextTokenId++;

        emit BadgeMinted(to, tokenId, uri);
    }

    /**
     * @dev Checks if a given address already holds a badge.
     * Relies on internal mappings and token IDs starting from 1.
     * @param account The address to check.
     * @return bool True if the address has a badge, false otherwise.
     */
    function hasBadge(address account) public view returns (bool) {
        // Check only our explicit tracking maps.
        uint256 tokenId = _addressToTokenId[account];
        // If token IDs start at 1, a value of 0 means no token was assigned.
        // Check that mapped ID is non-zero AND that the token ID is marked as existing.
        return tokenId != 0 && _tokenIdExists[tokenId];
    }

    /**
     * @dev See {IERC721-balanceOf}.
     * Overridden to use explicit tracking based on our mappings.
     */
    function balanceOf(address owner) public view virtual override(ERC721, IERC721) returns (uint256) {
        if (owner == address(0)) {
            revert ERC721InvalidOwner(address(0)); // Keep OZ error for consistency
        }
        // Use the explicit check based on mapping.
        uint256 tokenId = _addressToTokenId[owner];
        // Check that mapped ID is non-zero AND that the token ID is marked as existing.
        return (tokenId != 0 && _tokenIdExists[tokenId]) ? 1 : 0;
    }

    // --- Soulbound Implementation: Prevent Transfers ---

    /**
     * @dev Reverts with custom error to prevent transfers.
     */
    function _assertTransferAllowed() internal pure {
         revert TransferNotAllowed();
    }

    /**
     * @dev Reverts because transfers are disabled.
     */
    function approve(address, uint256) public virtual override(ERC721, IERC721) {
        _assertTransferAllowed();
    }

    /**
     * @dev Reverts because transfers are disabled.
     */
    function setApprovalForAll(address, bool) public virtual override(ERC721, IERC721) {
        _assertTransferAllowed();
    }

    /**
     * @dev Reverts because transfers are disabled.
     */
    function transferFrom(address, address, uint256) public virtual override(ERC721, IERC721) {
        _assertTransferAllowed();
    }

    /**
     * @dev Reverts because transfers are disabled.
     */
    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override(ERC721, IERC721) {
        _assertTransferAllowed();
    }

    // The following functions are overrides required by Solidity for ERC721URIStorage.

    /**
     * @dev See {IERC721Metadata-tokenURI}.
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        // Add existence check required by IERC721Metadata
        if (!_tokenIdExists[tokenId]) {
             revert ERC721NonexistentToken(tokenId);
        }
        return super.tokenURI(tokenId);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
} 