package output_test

import (
	"bytes"
	"os"
	"strings"
	"testing"

	"github.com/bnb-chain/example-hub/go/event-listener/pkg/output"
)

func captureOutput(f func()) string {
	var buf bytes.Buffer
	stdout := os.Stdout
	r, w, _ := os.Pipe()
	os.Stdout = w

	f()

	_ = w.Close()
	_, _ = buf.ReadFrom(r)
	os.Stdout = stdout

	return buf.String()
}

func TestStdoutWriter_SwapEvent(t *testing.T) {
	writer := output.NewStdoutWriter()

	data := map[string]interface{}{
		"__event":       "Swap",
		"sender":        "0xSender",
		"to":            "0xReceiver",
		"amount0In_hr":  "100.000000 TOKENA",
		"amount1Out_hr": "50.000000 TOKENB",
	}

	out := captureOutput(func() {
		err := writer.Write(data)
		if err != nil {
			t.Fatal(err)
		}
	})

	if !strings.Contains(out, "Swap Event") {
		t.Errorf("Expected Swap header, got: %s", out)
	}
	if !strings.Contains(out, "Token0 In:") || !strings.Contains(out, "100.000000") {
		t.Errorf("Missing Token0 In line")
	}
	if !strings.Contains(out, "Token1 Out:") || !strings.Contains(out, "50.000000") {
		t.Errorf("Missing Token1 Out line")
	}
}

func TestStdoutWriter_SyncEvent(t *testing.T) {
	writer := output.NewStdoutWriter()

	data := map[string]interface{}{
		"__event":  "Sync",
		"reserve0": "12345",
		"reserve1": "67890",
	}

	out := captureOutput(func() {
		err := writer.Write(data)
		if err != nil {
			t.Fatal(err)
		}
	})

	if !strings.Contains(out, "Sync Event") {
		t.Errorf("Expected Sync header")
	}
	if !strings.Contains(out, "Reserve0") || !strings.Contains(out, "12345") {
		t.Errorf("Expected reserve0 print")
	}
}

func TestStdoutWriter_RawEvent(t *testing.T) {
	writer := output.NewStdoutWriter()

	data := map[string]interface{}{
		"__event": "CustomEvent",
		"foo":     "bar",
	}

	out := captureOutput(func() {
		_ = writer.Write(data)
	})

	if !strings.Contains(out, "Event: CustomEvent") {
		t.Errorf("Expected raw event print")
	}
	if !strings.Contains(out, "foo: bar") {
		t.Errorf("Expected key-value print")
	}
}

func TestStdoutWriter_UnknownEvent(t *testing.T) {
	writer := output.NewStdoutWriter()

	data := map[string]interface{}{
		"something_else": "oops",
	}

	out := captureOutput(func() {
		_ = writer.Write(data)
	})

	if !strings.Contains(out, "Unknown event structure") {
		t.Errorf("Expected unknown structure fallback")
	}
}
