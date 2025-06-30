package listener

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"
	"time"

	"github.com/bnb-chain/example-hub/go/event-listener/pkg/ethutils"
	"github.com/bnb-chain/example-hub/go/event-listener/pkg/output"
	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
)

// Poll continuously fetches logs using HTTP polling.
func Poll(cfg Config) error {
	var writer output.OutputWriter
	switch cfg.OutputTarget {
	case "json":
		writer = output.NewJSONWriter()
	default:
		writer = output.NewStdoutWriter()
	}
	defer writer.Close()

	log.Println("Connecting to RPC...")
	client, err := ethclient.Dial(cfg.RPCURL)
	if err != nil {
		return fmt.Errorf("failed to connect to RPC: %w", err)
	}
	defer client.Close()

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

	// Dynamically fetch the two token addresses from the pair contract
	token0, token1, err := ethutils.GetTokenPair(client, contract, parsedABI)
	if err != nil {
		log.Printf("⚠️ Could not fetch token pair: %v", err)
	}

	// Fetch symbol+decimals for both tokens
	token0Meta, err := ethutils.GetTokenMetadata(client, token0)
	if err != nil {
		log.Printf("⚠️ Could not fetch token0 metadata: %v", err)
	}
	token1Meta, err := ethutils.GetTokenMetadata(client, token1)
	if err != nil {
		log.Printf("⚠️ Could not fetch token1 metadata: %v", err)
	}

	eventsByID := make(map[common.Hash]abi.Event)
	for _, ev := range parsedABI.Events {
		eventsByID[ev.ID] = ev
	}

	var topicHash common.Hash
	var event abi.Event
	hasEventFilter := cfg.EventName != ""

	if hasEventFilter {
		var ok bool
		event, ok = parsedABI.Events[cfg.EventName]
		if !ok {
			return fmt.Errorf("event '%s' not found in ABI", cfg.EventName)
		}
		topicHash = event.ID
	}

	contract = common.HexToAddress(cfg.ContractAddress)

	var fromBlock *big.Int
	if cfg.FromBlock != "latest" {
		blockNum, ok := new(big.Int).SetString(cfg.FromBlock, 10)
		if !ok {
			return fmt.Errorf("invalid from-block: %s", cfg.FromBlock)
		}
		fromBlock = blockNum
	} else {
		header, err := client.HeaderByNumber(context.Background(), nil)
		if err != nil {
			return fmt.Errorf("failed to fetch latest block: %w", err)
		}
		fromBlock = header.Number
	}

	log.Println("📡 Polling for logs every", cfg.PollInterval, "seconds...")
	ticker := time.NewTicker(time.Duration(cfg.PollInterval) * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Define block range: [from, from+window]
		toBlock := new(big.Int).Add(fromBlock, big.NewInt(int64(cfg.PollWindow)))

		query := ethereum.FilterQuery{
			FromBlock: fromBlock,
			ToBlock:   toBlock,
			Addresses: []common.Address{contract},
		}
		if hasEventFilter {
			query.Topics = [][]common.Hash{{topicHash}}
		}

		logs, err := client.FilterLogs(context.Background(), query)
		if err != nil {
			log.Printf("❌ Failed to fetch logs: %v\n", err)
			continue
		}

		if len(logs) == 0 {
			log.Println("🔍 No new events found.")
		}

		for _, vLog := range logs {
			log.Printf("📥 Log at block %d: %s\n", vLog.BlockNumber, vLog.TxHash.Hex())

			topic0 := vLog.Topics[0].Hex()
			event, ok := eventsByID[vLog.Topics[0]]
			if !ok {
				log.Printf("⚠️  Unknown event signature: %s\n", topic0)
				continue
			}

			data := make(map[string]interface{})
			data["__event"] = event.Name
			if err := parsedABI.UnpackIntoMap(data, event.Name, vLog.Data); err != nil {
				log.Printf("❌ Failed to decode log data for event %s: %v\n", event.Name, err)
				continue
			}
			// ─── Human-readable formatting for Swap events ───
			if data["__event"] == "Swap" {
				format := func(key string, meta *ethutils.TokenInfo) {
					if raw, ok := data[key].(*big.Int); ok && meta != nil {
						data[key+"_hr"] = ethutils.FormatTokenAmount(raw, meta.Decimals) + " " + meta.Symbol
					}
				}
				format("amount0In", token0Meta)
				format("amount1In", token1Meta)
				format("amount0Out", token0Meta)
				format("amount1Out", token1Meta)
			}

			// Decode indexed fields
			var indexedArgs []abi.Argument
			for _, arg := range event.Inputs {
				if arg.Indexed {
					indexedArgs = append(indexedArgs, arg)
				}
			}
			for i, input := range indexedArgs {
				if len(vLog.Topics) > i+1 {
					data[input.Name] = tryDecodeTopic(vLog.Topics[i+1], input.Type.String())
				}
			}

			if err := writer.Write(data); err != nil {
				log.Println("❌ Failed to write output:", err)
			}
		}

		// Move window forward
		fromBlock = new(big.Int).Add(toBlock, big.NewInt(1))
	}
	return nil
}
