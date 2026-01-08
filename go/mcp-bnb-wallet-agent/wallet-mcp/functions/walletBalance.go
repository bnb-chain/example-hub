package functions

import (
	"context"
	"fmt"
	"github.com/mark3labs/mcp-go/mcp"
	"math/big"
	"os"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// GetWalletBalance retrieves the native BNB balance for a user's wallet
func (wf *WalletFunctions) GetWalletBalance() (*big.Int, error) {
	// Get the user's wallet address
	publicKey, err := wf.ReadUserWallet()
	if err != nil {
		return nil, fmt.Errorf("wallet not found: %w", err)
	}
	fromAddr := common.HexToAddress(publicKey)

	// Connect to BNB Chain RPC
	ctx := context.Background()
	client, err := ethclient.DialContext(ctx, os.Getenv("BNB_RPC"))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RPC: %w", err)
	}
	defer client.Close()

	// Query the latest balance
	balance, err := client.BalanceAt(ctx, fromAddr, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get balance: %w", err)
	}

	return balance, nil
}

// GenerateGetWalletBalanceTool creates an MCP tool for checking wallet balance
func (wf *WalletFunctions) GenerateGetWalletBalanceTool() (mcp.Tool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error)) {
	tool := mcp.NewTool("get_wallet_balance",
		mcp.WithDescription("Get the native BNB balance of a user's wallet"),
		mcp.WithString("user_id", mcp.Required(), mcp.Description("Unique identifier for the user")),
	)

	handler := func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userId, _ := request.RequireString("user_id")
		wf.UserId = userId

		balance, err := wf.GetWalletBalance()
		if err != nil {
			return mcp.NewToolResultError(err.Error()), nil
		}
		return mcp.NewToolResultText(balance.String()), nil
	}
	return tool, handler
}
