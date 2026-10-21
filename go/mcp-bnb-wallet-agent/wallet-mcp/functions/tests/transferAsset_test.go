package tests

import (
	"context"
	"math/big"
	"os"
	"testing"

	"mcp-bnb-wallet-agent/wallet-mcp/db"
	"mcp-bnb-wallet-agent/wallet-mcp/functions"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/stretchr/testify/assert"
)

func TestTransferAsset(t *testing.T) {
	// Arrange
	bnbChainTestId := "97"
	testUserId := "test_user_341c212cb93b395"
	toAddress := "0x5A2D55362b3ce1Bb5434c16a2aBd923c429a3446"
	ctx := context.Background()

	mongoClient, err := db.ConnectToDB("mongodb://localhost:27017")
	defer func() {
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			t.Logf("Warning: failed to disconnect from MongoDB: %v", err)
		}
	}()
	if err != nil {
		t.Fatalf("failed to connect to MongoDB: %v", err)
	}

	client, err := ethclient.DialContext(ctx, os.Getenv("BNB_RPC"))
	if err != nil {
		t.Fatalf("failed to connect to RPC: %v", err)
	}

	wf := functions.WalletFunctions{
		MongoConnection: mongoClient,
		UserId:          testUserId,
	}

	// Act: transfer 0.0001 BNB
	amount := big.NewInt(1e14) // 0.0001 BNB
	txHash, err := wf.TransferAsset(bnbChainTestId, toAddress, amount)
	if err != nil {
		t.Fatalf("TransferAsset failed: %v", err)
	}

	// Assert
	receipt, _ := client.TransactionReceipt(ctx, common.HexToHash(txHash))
	assert.Equal(t, uint64(1), receipt.Status, "transaction should succeed")
}
