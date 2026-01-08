package functions

import (
	"context"
	"errors"
	"fmt"
	"github.com/mark3labs/mcp-go/mcp"
	"mcp-bnb-wallet-agent/wallet-mcp/db"

	"go.mongodb.org/mongo-driver/v2/bson"
)

// ReadUserWallet retrieves a user's public wallet address from the database
func (wf *WalletFunctions) ReadUserWallet() (string, error) {
	mg := db.MongoDB{
		Database:   "User",
		Collection: "Wallet",
	}

	var user []User
	ack := mg.Read(wf.MongoConnection, bson.D{{Key: "user_id", Value: wf.UserId}}, &user)
	if ack && len(user) > 0 {
		return user[0].PublicKey, nil
	}

	return "", errors.New("wallet not found for user")
}

// GenerateReadWalletTool creates an MCP tool for reading a wallet address
func (wf *WalletFunctions) GenerateReadWalletTool() (mcp.Tool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error)) {
	tool := mcp.NewTool("read_wallet",
		mcp.WithDescription("Retrieve a user's public wallet address from the database"),
		mcp.WithString("user_id", mcp.Required(), mcp.Description("Unique identifier for the user")),
	)

	handler := func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userId, _ := request.RequireString("user_id")
		wf.UserId = userId
		publicKey, err := wf.ReadUserWallet()
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to read wallet: %v", err)), nil
		}
		return mcp.NewToolResultText(publicKey), nil
	}

	return tool, handler
}
