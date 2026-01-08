package functions

import (
	"context"
	"github.com/mark3labs/mcp-go/mcp"
	"math/big"
)

// TransferAsset sends native BNB to another address
func (wf *WalletFunctions) TransferAsset(chainId string, toAddr string, amount *big.Int) (string, error) {
	// Native BNB transfer is just a transaction with empty data field
	return wf.SignTransaction(chainId, toAddr, []byte{}, amount)
}

// GenerateTransferAssetTool creates an MCP tool for transferring native BNB
func (wf *WalletFunctions) GenerateTransferAssetTool() (mcp.Tool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error)) {
	tool := mcp.NewTool("transfer_asset",
		mcp.WithDescription("Transfer native BNB to another address"),
		mcp.WithString("chain_id", mcp.Required(), mcp.Description("Chain ID (e.g., '56' for BSC mainnet, '97' for BSC testnet)")),
		mcp.WithString("to_address", mcp.Required(), mcp.Description("Recipient wallet address")),
		mcp.WithString("amount", mcp.Required(), mcp.Description("Amount to send in wei (1 BNB = 10^18 wei)")),
		mcp.WithString("user_id", mcp.Required(), mcp.Description("Unique identifier for the user")),
	)

	handler := func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		chainID, _ := request.RequireString("chain_id")
		toAddr, _ := request.RequireString("to_address")
		amountStr, _ := request.RequireString("amount")
		userId, _ := request.RequireString("user_id")
		wf.UserId = userId

		amount, ok := new(big.Int).SetString(amountStr, 10)
		if !ok {
			return mcp.NewToolResultError("invalid amount parameter"), nil
		}

		txHash, err := wf.TransferAsset(chainID, toAddr, amount)
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		return mcp.NewToolResultText(txHash), nil
	}
	return tool, handler
}
