interface IBulkRenewal {
    function rentPrice(
        string[] calldata names,
        uint256 duration,
        bool lifetime
    ) external view returns (uint256 total);

    function renewAll(
        string[] calldata names,
        uint256 duration,
        bool lifetime
    ) external payable;
}
