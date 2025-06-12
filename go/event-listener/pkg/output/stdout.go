package output

import (
	"fmt"
	"strings"
)

// StdoutWriter outputs events to stdout
type StdoutWriter struct{}

func NewStdoutWriter() *StdoutWriter {
	return &StdoutWriter{}
}

func (w *StdoutWriter) Write(data map[string]interface{}) error {
	eventName, ok := data["__event"].(string)
	if !ok {
		fmt.Println("❓ Unknown event structure")
		fmt.Println(data)
		return nil
	}

	switch eventName {
	case "Swap":
		printSwapEvent(data)
	case "Sync":
		printSyncEvent(data)
	default:
		printRawEvent(eventName, data)
	}
	return nil
}

func (w *StdoutWriter) Close() error {
	return nil
}

func printSwapEvent(data map[string]interface{}) {
	fmt.Println("🔁 Swap Event")
	fmt.Println(strings.Repeat("-", 40))

	fmt.Printf("Sender:   %v\n", data["sender"])
	fmt.Printf("To:       %v\n", data["to"])

	if v, ok := data["amount0In_hr"]; ok {
		fmt.Printf("Token0 In:  %v\n", v)
	}
	if v, ok := data["amount1In_hr"]; ok {
		fmt.Printf("Token1 In:  %v\n", v)
	}
	if v, ok := data["amount0Out_hr"]; ok {
		fmt.Printf("Token0 Out: %v\n", v)
	}
	if v, ok := data["amount1Out_hr"]; ok {
		fmt.Printf("Token1 Out: %v\n", v)
	}

	fmt.Println()
}

func printSyncEvent(data map[string]interface{}) {
	fmt.Println("📊 Sync Event")
	fmt.Println(strings.Repeat("-", 40))

	fmt.Printf("Reserve0: %v\n", data["reserve0"])
	fmt.Printf("Reserve1: %v\n", data["reserve1"])
	fmt.Println()
}

func printRawEvent(eventName string, data map[string]interface{}) {
	fmt.Printf("📤 Event: %s\n", eventName)
	fmt.Println(strings.Repeat("-", 40))
	for k, v := range data {
		if strings.HasSuffix(k, "_hr") && v == "0.000000" {
			continue // skip noisy zero HR fields
		}
		fmt.Printf("%s: %v\n", k, v)
	}
	fmt.Println()
}
