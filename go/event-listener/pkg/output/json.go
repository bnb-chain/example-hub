package output

import (
	"encoding/json"
	"os"
)

type JSONWriter struct {
	enc *json.Encoder
}

func NewJSONWriter() *JSONWriter {
	return &JSONWriter{enc: json.NewEncoder(os.Stdout)}
}

func (w *JSONWriter) Write(data map[string]interface{}) error {
	return w.enc.Encode(data)
}

func (w *JSONWriter) Close() error {
	return nil
}
