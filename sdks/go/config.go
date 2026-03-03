package docdigitizer

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultBaseURL    = "https://api.docdigitizer.com/v3/docingester"
	DefaultTimeout    = 5 * time.Minute
	DefaultMaxRetries = 3
)

// Config holds the client configuration.
type Config struct {
	APIKey     string
	BaseURL    string
	Timeout    time.Duration
	MaxRetries int
}

// Option is a functional option for configuring the client.
type Option func(*Config)

// WithBaseURL sets the API base URL.
func WithBaseURL(url string) Option {
	return func(c *Config) {
		c.BaseURL = strings.TrimRight(url, "/")
	}
}

// WithTimeout sets the HTTP request timeout.
func WithTimeout(d time.Duration) Option {
	return func(c *Config) {
		c.Timeout = d
	}
}

// WithMaxRetries sets the maximum number of retries for retryable errors.
func WithMaxRetries(n int) Option {
	return func(c *Config) {
		c.MaxRetries = n
	}
}

func resolveConfig(apiKey string, opts []Option) (*Config, error) {
	if apiKey == "" {
		apiKey = os.Getenv("DOCDIGITIZER_API_KEY")
	}
	if apiKey == "" {
		return nil, fmt.Errorf("docdigitizer: API key is required. Pass it to New() or set DOCDIGITIZER_API_KEY")
	}

	cfg := &Config{
		APIKey:     apiKey,
		BaseURL:    DefaultBaseURL,
		Timeout:    DefaultTimeout,
		MaxRetries: DefaultMaxRetries,
	}

	if envURL := os.Getenv("DOCDIGITIZER_BASE_URL"); envURL != "" {
		cfg.BaseURL = strings.TrimRight(envURL, "/")
	}
	if envTimeout := os.Getenv("DOCDIGITIZER_TIMEOUT"); envTimeout != "" {
		if ms, err := strconv.Atoi(envTimeout); err == nil {
			cfg.Timeout = time.Duration(ms) * time.Millisecond
		}
	}

	for _, opt := range opts {
		opt(cfg)
	}

	return cfg, nil
}
