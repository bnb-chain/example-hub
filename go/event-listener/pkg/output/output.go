package output

type OutputWriter interface {
	Write(data map[string]interface{}) error
	Close() error
}
