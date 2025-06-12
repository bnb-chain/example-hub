package listener

// Config holds all required parameters for subscribing to an event.
type Config struct {
	RPCURL          string // RPC endpoint (e.g., https://bsc-dataseed.binance.org)
	ContractAddress string // Smart contract address to listen to
	ABIPath         string // Path to the ABI JSON file
	EventName       string // Name of the event (case-sensitive)
	FromBlock       string // Starting block number (or "latest")
	OutputTarget    string // Where to send the output (stdout, json, etc.)
	Mode            string // "ws" or "poll"
	PollInterval    int    // seconds
	PollWindow      int    // number of blocks
	FetchABI        bool   // If true, fetch ABI from BscScan
	APIKey          string // Optional: BscScan API key
}
