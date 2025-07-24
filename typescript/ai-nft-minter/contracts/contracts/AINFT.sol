// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AINFT
 * @dev An ERC721 contract for minting AI-generated NFTs, fully updated for OpenZeppelin v5.0.
 * This contract allows the owner to mint new NFTs with a specific URI.
 */
contract AINFT is ERC721, ERC721URIStorage, Ownable {
    // A counter to keep track of the next token ID to be minted.
    uint256 private _nextTokenId;

    /**
     * @dev The constructor for the contract.
     * @param initialOwner The wallet address that will become the initial owner of this contract.
     * It initializes the ERC721 token with a name and symbol.
     * It also sets the contract owner, who will be the only one authorized to mint NFTs.
     */
    constructor(address initialOwner)
        ERC721("AI Generated NFT", "AINFT")
        Ownable(initialOwner)
    {}

    /**
     * @dev The core minting function. It can only be called by the contract owner.
     * Creates a new token and assigns it to the `to` address, associating it with a metadata URI.
     * @param to The address that will receive the minted NFT.
     * @param uri The URI for the NFT's metadata JSON file (typically an IPFS link).
     */
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    // The following functions are overrides required by Solidity due to diamond inheritance.
    // They are necessary to resolve conflicts between the parent contracts.

    /**
     * @dev See {IERC721-tokenURI}.
     * Overrides the tokenURI function to work with ERC721URIStorage.
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
     * Overrides the supportsInterface function to resolve inheritance conflicts.
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