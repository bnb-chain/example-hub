package main

import (
	"fmt"
	"log"
	"os"

	"github.com/bnb-chain/example-hub/go/event-listener/pkg/listener"
	"github.com/urfave/cli/v2"
)

func main() {
	app := &cli.App{
		Name:    "chainsub",
		Usage:   "Subscribe to smart contract events on any EVM-compatible chain",
		Version: "0.1.0",
		Commands: []*cli.Command{
			{
				Name:  "listen",
				Usage: "Listen to on-chain events in real time",
				Flags: []cli.Flag{
					&cli.StringFlag{
						Name:     "rpc",
						Usage:    "RPC URL of the node",
						Required: true,
						EnvVars:  []string{"RPC_URL"},
					},
					&cli.StringFlag{
						Name:     "contract",
						Usage:    "Contract address",
						Required: true,
						EnvVars:  []string{"CONTRACT_ADDRESS"},
					},
					&cli.StringFlag{
						Name:    "abi",
						Usage:   "Path to ABI JSON file",
						EnvVars: []string{"ABI_PATH"},
					},
					&cli.StringFlag{
						Name:    "event",
						Usage:   "Event name (case-sensitive)",
						EnvVars: []string{"EVENT_NAME"},
					},
					&cli.StringFlag{
						Name:    "from-block",
						Usage:   "Starting block (default: latest)",
						Value:   "latest",
						EnvVars: []string{"FROM_BLOCK"},
					},
					&cli.StringFlag{
						Name:    "output",
						Usage:   "Output type: stdout, json",
						Value:   "stdout",
						EnvVars: []string{"OUTPUT"},
					},
					&cli.StringFlag{
						Name:    "mode",
						Usage:   "Listening mode: ws (WebSocket) or poll (HTTP polling)",
						Value:   "ws",
						EnvVars: []string{"MODE"},
					},
					&cli.IntFlag{
						Name:    "poll-interval",
						Usage:   "Polling interval in seconds (only for poll mode)",
						Value:   5,
						EnvVars: []string{"POLL_INTERVAL"},
					},
					&cli.IntFlag{
						Name:    "poll-window",
						Usage:   "Block window size per poll (only for poll mode)",
						Value:   1,
						EnvVars: []string{"POLL_WINDOW"},
					},
					&cli.BoolFlag{
						Name:    "fetch-abi",
						Usage:   "Automatically fetch ABI from BscScan",
						EnvVars: []string{"FETCH_ABI"},
					},
					&cli.StringFlag{
						Name:    "bscscan-api-key",
						Usage:   "BscScan API key (optional for low-volume requests)",
						EnvVars: []string{"BSCSCAN_API_KEY"},
					},
				},
				Action: func(c *cli.Context) error {
					cfg := listener.Config{
						RPCURL:          c.String("rpc"),
						ContractAddress: c.String("contract"),
						ABIPath:         c.String("abi"),
						EventName:       c.String("event"),
						FromBlock:       c.String("from-block"),
						OutputTarget:    c.String("output"),
						Mode:            c.String("mode"),
						PollInterval:    c.Int("poll-interval"),
						PollWindow:      c.Int("poll-window"),
						FetchABI:        c.Bool("fetch-abi"),
						APIKey:          c.String("bscscan-api-key"),
					}

					if !cfg.FetchABI && cfg.ABIPath == "" {
						return fmt.Errorf("you must provide --abi or use --fetch-abi to retrieve it automatically")
					}

					if cfg.Mode == "poll" {
						return listener.Poll(cfg)
					}
					return listener.Listen(cfg)
				},
			},
		},
	}

	if err := app.Run(os.Args); err != nil {
		log.Fatal(err)
	}
}
