// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import {MarketplaceNFT} from "../src/MarketplaceNFT.sol";

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

contract MarketplaceNFTTest is Test {
    MarketplaceNFT private marketplace;

    address private seller = makeAddr("seller");
    address private buyer = makeAddr("buyer");

    function setUp() public {
        marketplace = new MarketplaceNFT("Marketplace", "MKT");
        vm.deal(seller, 10 ether);
        vm.deal(buyer, 10 ether);
    }

    function testMintAssignsOwnershipAndUri() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/1", 1 ether);

        assertEq(tokenId, 1);
        assertEq(marketplace.balanceOf(seller), 0);
        assertEq(marketplace.ownerOf(tokenId), address(marketplace));
        assertEq(marketplace.tokenURI(tokenId), "ipfs://token/1");
        (address listedSeller, uint256 price) = marketplace.listings(tokenId);
        assertEq(listedSeller, seller);
        assertEq(price, 1 ether);
    }

    function testMintSequentialIds() public {
        vm.prank(seller);
        uint256 first = marketplace.mint("ipfs://token/1", 1 ether);
        vm.prank(seller);
        uint256 second = marketplace.mint("ipfs://token/2", 2 ether);

        assertEq(first, 1);
        assertEq(second, 2);
    }

    function testTotalSupplyTracksMintedTokens() public {
        assertEq(marketplace.totalSupply(), 0);

        vm.prank(seller);
        marketplace.mint("ipfs://token/a", 1 ether);
        assertEq(marketplace.totalSupply(), 1);

        vm.prank(seller);
        marketplace.mint("ipfs://token/b", 1 ether);
        assertEq(marketplace.totalSupply(), 2);
    }

    function testBalanceOfZeroAddressReverts() public {
        vm.expectRevert("ZERO_ADDRESS");
        marketplace.balanceOf(address(0));
    }

    function testOwnerOfNonexistentTokenReverts() public {
        vm.expectRevert("TOKEN_DOES_NOT_EXIST");
        marketplace.ownerOf(999);
    }

    function testListAndCancelReturnsToSeller() public {
        vm.startPrank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/2", 1 ether);
        vm.stopPrank();

        (address listedSeller, uint256 price) = marketplace.listings(tokenId);
        assertEq(listedSeller, seller);
        assertEq(price, 1 ether);
        assertEq(marketplace.ownerOf(tokenId), address(marketplace));

        vm.prank(seller);
        marketplace.cancelListing(tokenId);

        (listedSeller, price) = marketplace.listings(tokenId);
        assertEq(listedSeller, address(0));
        assertEq(price, 0);
        assertEq(marketplace.ownerOf(tokenId), seller);

        vm.startPrank(seller);
        marketplace.list(tokenId, 2 ether);
        vm.stopPrank();

        (listedSeller, price) = marketplace.listings(tokenId);
        assertEq(listedSeller, seller);
        assertEq(price, 2 ether);
        assertEq(marketplace.ownerOf(tokenId), address(marketplace));
    }

    function testListRevertsForZeroPrice() public {
        vm.startPrank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/4", 1 ether);
        marketplace.cancelListing(tokenId);
        vm.expectRevert("INVALID_PRICE");
        marketplace.list(tokenId, 0);
        vm.stopPrank();
    }

    function testListRevertsWhenCallerNotOwner() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/6", 1 ether);

        vm.prank(seller);
        marketplace.cancelListing(tokenId);
        vm.prank(buyer);
        vm.expectRevert("NOT_OWNER");
        marketplace.list(tokenId, 1 ether);
    }

    function testApproveAllowsApprovedTransfer() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/approve", 1 ether);

        vm.prank(seller);
        marketplace.cancelListing(tokenId);
        vm.prank(seller);
        marketplace.approve(address(this), tokenId);
        marketplace.transferFrom(seller, buyer, tokenId);

        assertEq(marketplace.ownerOf(tokenId), buyer);
        assertEq(marketplace.getApproved(tokenId), address(0));
    }

    function testApproveRevertsForUnauthorizedCaller() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/unauthorized", 1 ether);

        vm.prank(seller);
        marketplace.cancelListing(tokenId);

        vm.prank(buyer);
        vm.expectRevert("NOT_AUTHORIZED");
        marketplace.approve(address(this), tokenId);
    }

    function testSetApprovalForAllEnablesOperatorTransfers() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/operator", 1 ether);

        vm.prank(seller);
        marketplace.cancelListing(tokenId);

        vm.prank(seller);
        marketplace.setApprovalForAll(address(this), true);
        marketplace.transferFrom(seller, buyer, tokenId);

        assertEq(marketplace.ownerOf(tokenId), buyer);
    }

    function testSetApprovalForAllToggle() public {
        vm.prank(seller);
        marketplace.setApprovalForAll(buyer, true);
        assertTrue(marketplace.isApprovedForAll(seller, buyer));

        vm.prank(seller);
        marketplace.setApprovalForAll(buyer, false);
        assertFalse(marketplace.isApprovedForAll(seller, buyer));
    }

    function testApprovalClearedOnListing() public {
        vm.startPrank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/list-approval", 1 ether);
        marketplace.cancelListing(tokenId);
        marketplace.approve(buyer, tokenId);
        marketplace.list(tokenId, 1 ether);
        vm.stopPrank();

        assertEq(marketplace.getApproved(tokenId), address(0));
    }

    function testCancelListingRevertsWhenNotSeller() public {
        vm.startPrank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/7", 1 ether);
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert("NOT_SELLER");
        marketplace.cancelListing(tokenId);
    }

    function testCancelListingRevertsWhenNotListed() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/8", 1 ether);

        vm.prank(seller);
        marketplace.cancelListing(tokenId);

        vm.prank(seller);
        vm.expectRevert("NOT_LISTED");
        marketplace.cancelListing(tokenId);
    }

    function testBuyTransfersTokenAndFunds() public {
        vm.startPrank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/3", 2 ether);
        vm.stopPrank();

        uint256 sellerStart = seller.balance;
        uint256 buyerStart = buyer.balance;

        vm.prank(buyer);
        marketplace.buy{value: 2 ether}(tokenId);

        assertEq(marketplace.ownerOf(tokenId), buyer);
        assertEq(buyer.balance, buyerStart - 2 ether);
        assertEq(seller.balance, sellerStart + 2 ether);

        (address listedSeller, uint256 price) = marketplace.listings(tokenId);
        assertEq(listedSeller, address(0));
        assertEq(price, 0);
    }

    function testBuyRevertsWithIncorrectPayment() public {
        vm.startPrank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/5", 1 ether);
        vm.stopPrank();

        vm.prank(buyer);
        vm.expectRevert("INCORRECT_PRICE");
        marketplace.buy{value: 0.1 ether}(tokenId);
    }

    function testBuyRevertsWhenTokenNotListed() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/9", 1 ether);

        vm.prank(seller);
        marketplace.cancelListing(tokenId);

        vm.prank(buyer);
        vm.expectRevert("NOT_LISTED");
        marketplace.buy{value: 1 ether}(tokenId);
    }

    function testBuyPreventsSellerReentrancy() public {
        ReentrantSeller reentrantSeller = new ReentrantSeller(marketplace);
        reentrantSeller.mintAndList("ipfs://token/reentrant", 1 ether);

        uint256 tokenId = reentrantSeller.tokenId();
        vm.prank(buyer);
        marketplace.buy{value: 1 ether}(tokenId);

        assertTrue(reentrantSeller.attemptedReenter());
        assertFalse(reentrantSeller.reenterSucceeded());
        bytes memory expected = abi.encodeWithSignature("Error(string)", "REENTRANCY");
        assertEq(reentrantSeller.lastRevertData(), expected);
        assertEq(marketplace.ownerOf(tokenId), buyer);
    }

    function testSafeTransferToNonReceiverReverts() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/10", 1 ether);
        vm.prank(seller);
        marketplace.cancelListing(tokenId);
        MockNonReceiver nonReceiver = new MockNonReceiver();
        vm.prank(seller);
        marketplace.approve(address(this), tokenId);

        vm.expectRevert("UNSAFE_RECIPIENT");
        marketplace.safeTransferFrom(seller, address(nonReceiver), tokenId);
    }

    function testSafeTransferToERC721ReceiverSucceeds() public {
        vm.prank(seller);
        uint256 tokenId = marketplace.mint("ipfs://token/11", 1 ether);
        vm.prank(seller);
        marketplace.cancelListing(tokenId);
        MockReceiver receiver = new MockReceiver();
        vm.prank(seller);
        marketplace.safeTransferFrom(seller, address(receiver), tokenId);

        assertEq(marketplace.ownerOf(tokenId), address(receiver));
        assertEq(receiver.lastOperator(), seller);
        assertEq(receiver.lastFrom(), seller);
        assertEq(receiver.lastTokenId(), tokenId);
    }

    function testSupportsInterfaces() public view {
        assertTrue(marketplace.supportsInterface(0x80ac58cd));
        assertTrue(marketplace.supportsInterface(0x5b5e139f));
        assertTrue(marketplace.supportsInterface(0x01ffc9a7));
        assertFalse(marketplace.supportsInterface(0xffffffff));
    }
}

contract MockNonReceiver {}

contract MockReceiver is IERC721Receiver {
    address private operator;
    address private from;
    uint256 private tokenId;

    function onERC721Received(address operator_, address from_, uint256 tokenId_, bytes calldata)
        external
        override
        returns (bytes4)
    {
        operator = operator_;
        from = from_;
        tokenId = tokenId_;
        return IERC721Receiver.onERC721Received.selector;
    }

    function lastOperator() external view returns (address) {
        return operator;
    }

    function lastFrom() external view returns (address) {
        return from;
    }

    function lastTokenId() external view returns (uint256) {
        return tokenId;
    }
}

contract ReentrantSeller {
    MarketplaceNFT private marketplace;
    uint256 private _tokenId;
    uint256 private _price;
    bool private _attempted;
    bool private _succeeded;
    bytes private _lastRevertData;

    constructor(MarketplaceNFT marketplace_) {
        marketplace = marketplace_;
    }

    function mintAndList(string memory uri, uint256 price) external {
        _tokenId = marketplace.mint(uri, price);
        _price = price;
    }

    function tokenId() external view returns (uint256) {
        return _tokenId;
    }

    function attemptedReenter() external view returns (bool) {
        return _attempted;
    }

    function reenterSucceeded() external view returns (bool) {
        return _succeeded;
    }

    function lastRevertData() external view returns (bytes memory) {
        return _lastRevertData;
    }

    receive() external payable {
        _attempted = true;
        delete _lastRevertData;
        try marketplace.list(_tokenId, _price) {
            _succeeded = true;
        } catch (bytes memory reason) {
            _lastRevertData = reason;
        }
    }
}
