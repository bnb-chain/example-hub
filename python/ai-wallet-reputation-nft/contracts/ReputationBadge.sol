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
 * @title ReputationBadge (Simplified)
 * @dev An ERC721 contract for minting soulbound reputation badges.
 * Relies on standard OpenZeppelin ERC721 for ownership tracking.
 * Badges are non-transferable and can only be minted by the contract owner.
 * Metadata URI is set upon minting.
 * Uses custom errors and emits a specific BadgeMinted event.
 */
contract ReputationBadge is ERC721, ERC721URIStorage, Ownable {
    // Event for specific tracking
    event BadgeMinted(address indexed recipient, uint256 indexed tokenId, string tokenURI);

    // Use a simple counter state variable, starting from 1
    uint256 private _nextTokenId = 1;

    /**
     * @dev Constructor initializes the ERC721 token and Ownable owner.
     * @param initialOwner The address that will initially own the contract.
     */
    constructor(address initialOwner) ERC721("ReputationBadge", "REPB") Ownable(initialOwner) {}

    /**
     * @dev Mints a new badge to the specified address with the given token URI.
     * Can only be called by the contract owner.
     * Reverts if the recipient already has a badge (using standard balanceOf).
     * Emits {Transfer} and {BadgeMinted} events.
     * @param to The address to mint the badge to.
     * @param uri The metadata URI for the badge.
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        // Check using standard balanceOf if recipient already has a token
        if (balanceOf(to) > 0) {
            revert RecipientAlreadyHasBadge(to);
        }

        uint256 tokenId = _nextTokenId;
        _nextTokenId++; // Increment before minting to ensure ID is used

        _safeMint(to, tokenId); // Emits Transfer event, updates internal _owners mapping
        _setTokenURI(tokenId, uri); // Relies on _exists check which uses internal _owners

        emit BadgeMinted(to, tokenId, uri);
    }

    /**
     * @dev Checks if a given address already holds a badge using standard balanceOf.
     * @param account The address to check.
     * @return bool True if the address has a badge, false otherwise.
     */
    function hasBadge(address account) public view returns (bool) {
        // Rely on standard balanceOf provided by OpenZeppelin ERC721
        return balanceOf(account) > 0;
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
