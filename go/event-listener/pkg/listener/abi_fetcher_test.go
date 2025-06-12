package listener

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestFetchABIFromURL_Success(t *testing.T) {
	mockABI := `[{ "type": "function", "name": "foo", "inputs": [] }]`

	// Start mock HTTP server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, `{"status":"1","message":"OK","result":%q}`, mockABI)
	}))
	defer server.Close()

	// Call the internal fetch function directly with mock URL
	result, err := fetchABIFromURL(server.URL)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result != mockABI {
		t.Errorf("expected ABI %q, got %q", mockABI, result)
	}
}

func TestFetchABIFromURL_FailureStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, `{"status":"0","message":"NOTOK","result":"Invalid address"}`)
	}))
	defer server.Close()

	_, err := fetchABIFromURL(server.URL)
	if err == nil || err.Error() != "BscScan API error: NOTOK" {
		t.Errorf("expected API error, got %v", err)
	}
}
