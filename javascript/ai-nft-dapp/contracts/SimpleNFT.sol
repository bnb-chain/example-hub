// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MyNFT is ERC721 {
    string private _myBaseURI;
    uint256 private _nextTokenId;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) ERC721(name, symbol) {
        _myBaseURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _myBaseURI;
    }

    function mint(address to) public {
        _safeMint(to, _nextTokenId);
        _nextTokenId++;
    }
}
