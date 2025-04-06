package utils

import (
	"crypto/ecdsa"
	"log"
	"os"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/joho/godotenv"

	bip39 "github.com/tyler-smith/go-bip39"
	bip32 "github.com/tyler-smith/go-bip32"
)

// LoadEnv loads .env file
func LoadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  No .env file found. Using system environment variables.")
	}
}

// MustGetEnv returns a required env variable
func MustGetEnv(key string) string {
	value := os.Getenv(key)
	if value == "" {
		log.Fatalf("❌ Required environment variable %s not set", key)
	}
	return value
}

// DerivePrivateKeyFromMnemonic generates an Ethereum-compatible private key from a BIP39 mnemonic
func DerivePrivateKeyFromMnemonic(mnemonic string) (*ecdsa.PrivateKey, error) {
	// Generate seed from mnemonic
	seed := bip39.NewSeed(mnemonic, "")

	// Master key
	masterKey, err := bip32.NewMasterKey(seed)
	if err != nil {
		return nil, err
	}

	// Derive Ethereum path: m/44'/60'/0'/0/0
	purpose, _ := masterKey.NewChildKey(bip32.FirstHardenedChild + 44)
	coinType, _ := purpose.NewChildKey(bip32.FirstHardenedChild + 60)
	account, _ := coinType.NewChildKey(bip32.FirstHardenedChild + 0)
	change, _ := account.NewChildKey(0)
	addressIndex, _ := change.NewChildKey(0)

	// Convert to Ethereum ecdsa.PrivateKey
	privateKey, err := crypto.ToECDSA(addressIndex.Key)
	if err != nil {
		return nil, err
	}

	return privateKey, nil
}
