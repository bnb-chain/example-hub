package listener

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/bnb-chain/example-hub/go/event-listener/pkg/ethutils"
	"github.com/bnb-chain/example-hub/go/event-listener/pkg/output"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/fatih/color"
)

// Listen sets up the subscription and processes events.
func Listen(cfg Config) error {
	// Setup output writer
	var writer output.OutputWriter
	switch cfg.OutputTarget {
	case "json":
		writer = output.NewJSONWriter()
	default:
		writer = output.NewStdoutWriter()
	}
	defer writer.Close()

	// 1. Connect to the RPC endpoint
	log.Println("Connecting to RPC...")
	client, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		return fmt.Errorf("failed to connect to RPC: %w", err)
	}
	defer client.Close()

	// 2. Read and parse the ABI
	log.Println("Parsing ABI...")
	var abiData []byte

	if cfg.FetchABI {
		log.Println("🔍 Fetching ABI from BscScan...")
		abiJSON, err := FetchABIFromBscScan(cfg.ContractAddress, cfg.APIKey)
		if err != nil {
			return fmt.Errorf("failed to fetch ABI: %w", err)
		}
		abiData = []byte(abiJSON)
	} else {
		abiData, err = os.ReadFile(cfg.ABIPath)
		if err != nil {
			return fmt.Errorf("failed to read ABI file: %w", err)
		}
	}

	parsedABI, err := abi.JSON(strings.NewReader(string(abiData)))
	if err != nil {
		return fmt.Errorf("failed to parse ABI: %w", err)
	}

	contract := common.HexToAddress(cfg.ContractAddress)
	token0, token1, err := ethutils.GetTokenPair(client, contract, parsedABI)
	if err != nil {
		log.Printf("⚠️ Could not fetch token pair: %v", err)
	}

	token0Meta, err := ethutils.GetTokenMetadata(client, token0)
	if err != nil {
		log.Printf("⚠️ Could not fetch token0 metadata: %v", err)
	}

	token1Meta, err := ethutils.GetTokenMetadata(client, token1)
	if err != nil {
		log.Printf("⚠️ Could not fetch token1 metadata: %v", err)
	}

	// 3. Get the event signature topic (topic[0])
	event, ok := parsedABI.Events[cfg.EventName]
	if !ok {
		return fmt.Errorf("event '%s' not found in ABI", cfg.EventName)
	}
	topicHash := event.ID

	// 4. Convert "fromBlock" string to *big.Int
	var fromBlock *big.Int
	if cfg.FromBlock != "latest" {
		blockNum, ok := new(big.Int).SetString(cfg.FromBlock, 10)
		if !ok {
			return fmt.Errorf("invalid from-block: %s", cfg.FromBlock)
		}
		fromBlock = blockNum
	}

	// 5. Build the filter query
	query := ethereum.FilterQuery{
		FromBlock: fromBlock,
		Addresses: []common.Address{
			common.HexToAddress(cfg.ContractAddress),
		},
		Topics: [][]common.Hash{
			{topicHash}, // topic[0] = event signature
		},
	}

	// 6. Create log channel + subscribe
	logs := make(chan types.Log)
	ctx := context.Background()
	log.Println("Subscribing to logs...")
	sub, err := client.SubscribeFilterLogs(ctx, query, logs)
	if err != nil {
		return fmt.Errorf("failed to subscribe to logs: %w", err)
	}

	defer func() {
		sub.Unsubscribe()
		close(logs)
	}()

	fmt.Println("📡 Listening for logs... (Ctrl+C to quit)")

	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt, syscall.SIGTERM)
	// 7. Handle logs in a loop
	for {
		select {
		case <-signalChan:
			fmt.Println("👋 Gracefully shutting down...")
			return nil
		case err := <-sub.Err():
			log.Println("❌ Subscription error:", err)
			return err
		case err := <-sub.Err():
			log.Println("❌ Subscription error:", err)
			return err

		case vLog := <-logs:
			color.New(color.FgHiGreen).Print("● ")
			fmt.Println("📥 Log received:")
			fmt.Printf("TxHash: %s | Block: %d\n", vLog.TxHash.Hex(), vLog.BlockNumber)

			// 8. Decode non-indexed args from data
			data := make(map[string]interface{})
			if err := parsedABI.UnpackIntoMap(data, cfg.EventName, vLog.Data); err != nil {
				log.Println("❌ Failed to decode log:", err)
				continue
			}

			// 9. Decode indexed args from topics[1..]
			var indexedArgs []abi.Argument
			for _, arg := range event.Inputs {
				if arg.Indexed {
					indexedArgs = append(indexedArgs, arg)
				}
			}
			for i, input := range indexedArgs {
				if len(vLog.Topics) > i+1 {
					// Most indexed values are addresses, fallback to raw hash if needed
					data[input.Name] = tryDecodeTopic(vLog.Topics[i+1], input.Type.String())
				}
			}

			if data["__event"] == "Swap" {
				// Safe cast checks and formatting
				format := func(val interface{}, decimals int, symbol string) string {
					if n, ok := val.(*big.Int); ok {
						return ethutils.FormatTokenAmount(n, decimals) + " " + symbol
					}
					return "0.000000 " + symbol
				}

				data["amount0In_hr"] = format(data["amount0In"], token0Meta.Decimals, token0Meta.Symbol)
				data["amount1In_hr"] = format(data["amount1In"], token1Meta.Decimals, token1Meta.Symbol)
				data["amount0Out_hr"] = format(data["amount0Out"], token0Meta.Decimals, token0Meta.Symbol)
				data["amount1Out_hr"] = format(data["amount1Out"], token1Meta.Decimals, token1Meta.Symbol)
			}

			// 10. Output to stdout (for now)
			if err := writer.Write(data); err != nil {
				log.Println("❌ Failed to write output:", err)
			}
		}
	}
}

// tryDecodeTopic safely decodes indexed topics based on type
func tryDecodeTopic(topic common.Hash, typ string) interface{} {
	switch typ {
	case "address":
		return common.HexToAddress(topic.Hex())
	default:
		return topic.Hex() // fallback to raw hash string
	}
}
