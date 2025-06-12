package listener

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func FetchABIFromBscScan(address string, apiKey string) (string, error) {
	url := fmt.Sprintf("https://api.bscscan.com/api?module=contract&action=getabi&address=%s", address)
	if apiKey != "" {
		url += fmt.Sprintf("&apikey=%s", apiKey)
	}

	resp, err := http.Get(url)
	if err != nil {
		return "", fmt.Errorf("failed to fetch ABI from BscScan: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read BscScan response: %w", err)
	}

	var result struct {
		Status  string
		Message string
		Result  string
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse BscScan response: %w", err)
	}

	if result.Status != "1" {
		return "", fmt.Errorf("BscScan API error: %s", result.Message)
	}

	return result.Result, nil
}
