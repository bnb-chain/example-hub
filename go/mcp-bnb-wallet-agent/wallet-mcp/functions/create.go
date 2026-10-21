package functions

import (
	"context"
	"encoding/hex"
	"fmt"
	"github.com/mark3labs/mcp-go/mcp"
	"mcp-bnb-wallet-agent/wallet-mcp/db"

	"github.com/ethereum/go-ethereum/crypto"
)

// CreateWallet generates a new Ethereum wallet or returns existing one for the user
func (wf *WalletFunctions) CreateWallet() (string, error) {
	// Check if user already has a wallet
	pk, err := wf.ReadUserWallet()
	if err == nil && pk != "" {
		return pk, nil
	}

	mg := db.MongoDB{
		Database:   "User",
		Collection: "Wallet",
	}

	// Generate new wallet keypair
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return "", fmt.Errorf("failed to generate wallet: %w", err)
	}

	publicAddress := crypto.PubkeyToAddress(privateKey.PublicKey).Hex()
	privateKeyHex := hex.EncodeToString(crypto.FromECDSA(privateKey))

	user := User{
		PublicKey:  publicAddress,
		PrivateKey: privateKeyHex,
		UserId:     wf.UserId,
	}

	ack := mg.Insert(wf.MongoConnection, user)
	if !ack {
		return "", fmt.Errorf("failed to insert wallet into database")
	}

	return publicAddress, nil
}

// GenerateCreateWalletTool creates an MCP tool for wallet creation
func (wf *WalletFunctions) GenerateCreateWalletTool() (mcp.Tool, func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error)) {
	tool := mcp.NewTool("create_wallet",
		mcp.WithDescription("Create a new BNB Chain wallet for a user, or return existing wallet if one already exists."),
		mcp.WithString("user_id", mcp.Required(), mcp.Description("Unique identifier for the user")),
	)

	handler := func(ctx context.Context, request mcp.CallToolRequest) (*mcp.CallToolResult, error) {
		userId, _ := request.RequireString("user_id")
		wf.UserId = userId
		publicKey, err := wf.CreateWallet()
		if err != nil {
			return mcp.NewToolResultError(fmt.Sprintf("failed to create wallet: %v", err)), nil
		}
		return mcp.NewToolResultText(publicKey), nil
	}

	return tool, handler
}
