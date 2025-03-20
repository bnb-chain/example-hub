package main

import (
	"context"
	"log"
	"math/big"
	"strings"
	"time"
	"os"

	"github.com/bnb-chain/eip7702-demo/bsc"
	"github.com/bnb-chain/eip7702-demo/contracts/V2router"
	"github.com/bnb-chain/eip7702-demo/contracts/bep20"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/joho/godotenv"
)

const (
	BSC_TESTNET_RPC = "https://bsc-testnet.bnbchain.org"
	ROUTER_ADDRESS  = "0x66c488c48fF2CB17450391D24b923A92e5f6da5C"
	USDT_ADDRESS    = "0x11952129E0583F4d1DF5E93384Be07C405C11D6b"
	WBNB_ADDRESS    = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Connect to BSC testnet
	client, err := ethclient.Dial(BSC_TESTNET_RPC)
	if err != nil {
		log.Fatalf("Failed to connect to BSC: %v", err)
	}
	defer client.Close()

	// Get private key from environment
	bobPrivateKey := os.Getenv("BOB_PRIVATE_KEY")
	if bobPrivateKey == "" {
		log.Fatal("Bob PRIVATE_KEY not found in .env")
	}

	joePrivateKey := os.Getenv("JOE_PRIVATE_KEY")
	if joePrivateKey == "" {
		log.Fatal("Joe PRIVATE_KEY not found in .env")
	}

	Bob, err := bsc.NewAccount(client, bobPrivateKey)
	if err != nil {
		log.Fatalf("Failed to create Bob account: %v", err)
	}
	log.Printf("Bob's address: %s", Bob.Addr.Hex())

	Joe, err := bsc.NewAccount(client, joePrivateKey)
	if err != nil {
		log.Fatalf("Failed to create Joe account: %v", err)
	}
	log.Printf("Joe's address: %s", Joe.Addr.Hex())

	// Get Bob's balance
	balance, err := client.BalanceAt(context.Background(), *Bob.Addr, nil)
	if err != nil {
		log.Fatalf("Failed to retrieve Bob's balance: %v", err)
	}

	log.Printf("Bob's testnet BNB balance: %s\n", balance.String())

	// Setup contract addresses
	routerAddr := common.HexToAddress(ROUTER_ADDRESS)
	usdtAddr := common.HexToAddress(USDT_ADDRESS)
	wbnbAddr := common.HexToAddress(WBNB_ADDRESS)

	// Create token instances
	wbnbInstance, err := bep20.NewBep20(wbnbAddr, client)
	if err != nil {
		log.Fatalf("Failed to create WBNB instance: %v", err)
	}

	usdtInstance, err := bep20.NewBep20(usdtAddr, client)
	if err != nil {
		log.Fatalf("Failed to create USDT instance: %v", err)
	}

	opts0, err := Joe.BuildTransactOpts(0, nil, 3e6)
	if err != nil {
		log.Fatalf("Failed to build transaction options: %v", err)
	}
	initBobWBNBBal, err := wbnbInstance.Transfer(opts0, *Bob.Addr, big.NewInt(1e16))
	if err != nil {
		log.Fatalf("Failed to Transfer : %v", err)
	}
	// Wait for transaction confirmation
	receipt0 := Joe.GetReceipt(initBobWBNBBal.Hash(), 120)
	if receipt0 == nil || receipt0.Status != 1 {
		log.Fatalf("EIP7702 transaction failed or timed out")
	}

	// Bob sign authorizes to the router contract
	auth1 := Bob.SignEIP702Auth(routerAddr, nil, nil)
	if auth1 == nil {
		log.Fatalf("Failed to sign EIP702 authorization")
	}
	authorization := []types.SetCodeAuthorization{*auth1}

	// Joe sends EIP7702 transaction for Bob's authorization
	opts1, err := Joe.BuildTransactOpts(0, nil, 3e6)
	if err != nil {
		log.Fatalf("Failed to build transaction options: %v", err)
	}

	EIP7702Tx, err := Joe.SendEIP7702Tx(opts1, nil, authorization, nil, nil)
	if err != nil {
		log.Fatalf("Failed to send EIP7702 transaction: %v", err)
	}
	log.Printf("EIP7702 transaction hash: %s", EIP7702Tx.Hex())

	// Wait for transaction confirmation
	receipt := Joe.GetReceipt(*EIP7702Tx, 120)
	if receipt == nil || receipt.Status != 1 {
		log.Fatalf("EIP7702 transaction failed or timed out")
	}
	// Check Bob code Hash Contain Swap Contract address
	BobCodeAt, err := client.CodeAt(context.Background(), *Bob.Addr, nil)
	if err != nil {
		log.Fatalf("query CodeAt failed: %v", err)
	}
	BobCodeHash := common.Bytes2Hex(BobCodeAt)
	log.Printf("Bob code hash: %s", BobCodeHash)

	// Create router instance
	routerInstance, err := V2router.NewSimpleRouter(*Bob.Addr, client)
	if err != nil {
		log.Fatalf("Failed to create router instance: %v", err)
	}

	// Check initial balances
	bobWBNBBal, err := wbnbInstance.BalanceOf(nil, *Bob.Addr)
	if err != nil {
		log.Fatalf("Failed to get Bob's WBNB balance: %v", err)
	}
	log.Printf("Bob's initial WBNB balance: %s", ToStringByPrecise(bobWBNBBal, 18))

	// Check final balances
	bobUSDTBalInitial, err := usdtInstance.BalanceOf(nil, *Bob.Addr)
	if err != nil {
		log.Fatalf("Failed to get Bob's USDT balance: %v", err)
	}
	log.Printf("Bob's initial USDT balance: %s", ToStringByPrecise(bobUSDTBalInitial, 6))

	// Setup swap parameters
	amountIn := ToIntByPrecise("0.01", 18) // 0.01 WBNB
	amountOutMin := ToIntByPrecise("1", 2) // Accept above 100 amount of USDT
	path := []common.Address{wbnbAddr, usdtAddr}
	deadline := big.NewInt(time.Now().Unix() + 300)

	// Execute swap
	opts2, err := Joe.BuildTransactOpts(0, nil, 3e6)
	if err != nil {
		log.Fatalf("Failed to build transaction options: %v", err)
	}

	swapTx, err := routerInstance.SwapExactTokensForTokens(opts2, amountIn, amountOutMin, path, *Bob.Addr, deadline)
	if err != nil {
		log.Fatalf("Failed to execute swap: %v", err)
	}
	log.Printf("Swap transaction hash: %s", swapTx.Hash().Hex())

	receipt = Joe.GetReceipt(swapTx.Hash(), 30)
	if receipt == nil || receipt.Status != 1 {
		log.Fatalf("Swap transaction failed or timed out")
	}

	// Check final balances
	bobUSDTBal, err := usdtInstance.BalanceOf(nil, *Bob.Addr)
	if err != nil {
		log.Fatalf("Failed to get Bob's USDT balance: %v", err)
	}
	log.Printf("Bob's final USDT balance: %s", ToStringByPrecise(bobUSDTBal, 6))

	bobWBNBBalFinal, err := wbnbInstance.BalanceOf(nil, *Bob.Addr)
	if err != nil {
		log.Fatalf("Failed to get Bob's final WBNB balance: %v", err)
	}
	log.Printf("Bob's final WBNB balance: %s", ToStringByPrecise(bobWBNBBalFinal, 18))
}

func ToIntByPrecise(value string, precise int64) *big.Int {
	value = strings.TrimSpace(value)
	parts := strings.Split(value, ".")
	if len(parts) == 1 {
		parts = append(parts, "0")
	}
	precise = precise - int64(len(parts[1]))
	if precise < 0 {
		precise = 0
	}
	value = parts[0] + parts[1]
	bi := new(big.Int)
	bi.SetString(value, 10)
	if precise > 0 {
		bi.Mul(bi, new(big.Int).Exp(big.NewInt(10), big.NewInt(precise), nil))
	}
	return bi
}

func ToStringByPrecise(value *big.Int, precise int64) string {
	if value == nil {
		return "0"
	}
	value = new(big.Int).Set(value)
	precise = -precise
	if precise < 0 {
		precise = 0
	}
	value.Div(value, new(big.Int).Exp(big.NewInt(10), big.NewInt(precise), nil))
	return value.String()
}
