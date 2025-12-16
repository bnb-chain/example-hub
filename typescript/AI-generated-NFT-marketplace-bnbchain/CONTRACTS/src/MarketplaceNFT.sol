// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @dev Minimal interface for contracts that wish to receive ERC721 tokens.
interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

/// @title MarketplaceNFT
/// @notice Simple ERC721 implementation with a built-in fixed-price marketplace.
contract MarketplaceNFT {
    struct Listing {
        address seller;
        uint256 price;
    }

    string public name;
    string public symbol;

    uint256 private _nextTokenId = 1;
    uint256 private _totalMinted;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;

    mapping(uint256 => Listing) public listings;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Minted(address indexed to, uint256 indexed tokenId, string tokenURI);
    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event ListingCancelled(uint256 indexed tokenId);
    event Purchased(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price);

    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "REENTRANCY");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function balanceOf(address owner) public view returns (uint256) {
        require(owner != address(0), "ZERO_ADDRESS");
        return _balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "TOKEN_DOES_NOT_EXIST");
        return owner;
    }

    function totalSupply() external view returns (uint256) {
        return _totalMinted;
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_exists(tokenId), "TOKEN_DOES_NOT_EXIST");
        return _tokenURIs[tokenId];
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_exists(tokenId), "TOKEN_DOES_NOT_EXIST");
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function approve(address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(to != owner, "APPROVE_TO_OWNER");
        require(msg.sender == owner || isApprovedForAll(owner, msg.sender), "NOT_AUTHORIZED");
        _approve(to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public {
        require(operator != msg.sender, "APPROVE_TO_CALLER");
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        require(_isApprovedOrOwner(msg.sender, tokenId), "NOT_AUTHORIZED");
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, data), "UNSAFE_RECIPIENT");
    }

    function mint(string calldata uri, uint256 price) external returns (uint256 tokenId) {
        require(price > 0, "INVALID_PRICE");
        tokenId = _nextTokenId++;
        _mint(address(this), tokenId, uri);
        listings[tokenId] = Listing({seller: msg.sender, price: price});
        emit Listed(tokenId, msg.sender, price);
    }

    function list(uint256 tokenId, uint256 price) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "NOT_OWNER");
        require(price > 0, "INVALID_PRICE");

        _transfer(msg.sender, address(this), tokenId);
        listings[tokenId] = Listing({seller: msg.sender, price: price});

        emit Listed(tokenId, msg.sender, price);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "NOT_LISTED");
        require(listing.seller == msg.sender, "NOT_SELLER");

        delete listings[tokenId];
        _transfer(address(this), listing.seller, tokenId);

        emit ListingCancelled(tokenId);
    }

    function buy(uint256 tokenId) external payable nonReentrant {
        Listing memory listing = listings[tokenId];
        require(listing.seller != address(0), "NOT_LISTED");
        require(msg.value == listing.price, "INCORRECT_PRICE");

        delete listings[tokenId];

        _transfer(address(this), msg.sender, tokenId);

        (bool success,) = listing.seller.call{value: msg.value}("");
        require(success, "TRANSFER_FAILED");

        emit Purchased(tokenId, listing.seller, msg.sender, msg.value);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd // ERC721 interface id
            || interfaceId == 0x5b5e139f // ERC721 metadata interface id
            || interfaceId == 0x01ffc9a7; // ERC165 interface id
    }

    function _exists(uint256 tokenId) private view returns (bool) {
        return _owners[tokenId] != address(0);
    }

    function _mint(address to, uint256 tokenId, string memory uri) private {
        require(to != address(0), "ZERO_ADDRESS");
        require(!_exists(tokenId), "TOKEN_EXISTS");

        _owners[tokenId] = to;
        _balances[to] += 1;
        _totalMinted += 1;
        _tokenURIs[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
        emit Minted(to, tokenId, uri);
    }

    function _transfer(address from, address to, uint256 tokenId) private {
        require(ownerOf(tokenId) == from, "NOT_OWNER");
        require(to != address(0), "ZERO_ADDRESS");

        _approve(address(0), tokenId);

        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    function _approve(address to, uint256 tokenId) private {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) private view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data)
        private
        returns (bool)
    {
        if (to.code.length == 0) {
            return true;
        }

        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch (bytes memory reason) {
            if (reason.length == 0) {
                revert("UNSAFE_RECIPIENT");
            } else {
                assembly {
                    revert(add(32, reason), mload(reason))
                }
            }
        }
    }
}
