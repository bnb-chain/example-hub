package tests

import (
	"context"
	"testing"

	"mcp-bnb-wallet-agent/wallet-mcp/db"
	"mcp-bnb-wallet-agent/wallet-mcp/functions"

	"github.com/stretchr/testify/assert"
)

func TestGetWalletBalance(t *testing.T) {
	// Arrange
	testUserId := "test_user_341c212cb93b395"
	mongoClient, err := db.ConnectToDB("mongodb://localhost:27017")
	if err != nil {
		t.Fatalf("failed to connect to MongoDB: %v", err)
	}
	defer func() {
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			t.Logf("Warning: failed to disconnect from MongoDB: %v", err)
		}
	}()

	wf := functions.WalletFunctions{
		MongoConnection: mongoClient,
		UserId:          testUserId,
	}

	// Act
	balance, err := wf.GetWalletBalance()
	if err != nil {
		t.Fatalf("GetWalletBalance failed: %v", err)
	}

	// Assert
	assert.NotNil(t, balance)
	assert.True(t, balance.Sign() >= 0, "balance must be >= 0")
	t.Logf("Wallet balance: %s wei", balance.String())
}
