package tests

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"testing"
	"time"

	"mcp-bnb-wallet-agent/wallet-mcp/db"
	"mcp-bnb-wallet-agent/wallet-mcp/functions"

	"github.com/stretchr/testify/assert"
	"go.mongodb.org/mongo-driver/v2/bson"
)

func RandomString(length int) string {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	// hex encoding doubles the length (1 byte -> 2 chars)
	return hex.EncodeToString(bytes)[:length]
}
func TestCreate(t *testing.T) {
	client, err := db.ConnectToDB("mongodb://localhost:27017")

	t.Run("User can create a wallet", func(t *testing.T) {
		// Arrange
		if err != nil {
			t.Fatalf("failed to connect to mongodb: %v", err)
		}
		wf := functions.WalletFunctions{
			MongoConnection: client,
			UserId:          RandomString(15),
		}
		mg := db.MongoDB{
			Database:   "User",
			Collection: "Wallet",
		}
		var user []functions.User

		// Act
		pk, err := wf.CreateWallet()
		if err != nil {
			t.Fatalf("failed to create wallet: %v", err)
		}
		time.Sleep(2 * time.Second)
		ack := mg.Read(wf.MongoConnection, bson.D{{Key: "user_id", Value: wf.UserId}}, &user)
		if !ack {
			t.Fatalf("failed to read wallet from database")
		}

		// Assert
		assert.Equal(t, pk, user[0].PublicKey)
	})

	t.Cleanup(func() {
		_ = client.Disconnect(context.Background())
	})
}
