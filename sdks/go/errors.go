package docdigitizer

import (
	"fmt"
	"strings"
)

// DocDigitizerError is the base error type for all SDK errors.
type DocDigitizerError struct {
	Message    string
	StatusCode int
	TraceID    string
	Messages   []string
	Timers     map[string]interface{}
}

func (e *DocDigitizerError) Error() string {
	return e.Message
}

// AuthenticationError is returned for HTTP 401 responses.
type AuthenticationError struct{ DocDigitizerError }

// ValidationError is returned for HTTP 400 responses.
type ValidationError struct{ DocDigitizerError }

// RateLimitError is returned for HTTP 429 responses.
type RateLimitError struct{ DocDigitizerError }

// ServerError is returned for HTTP 500 responses.
type ServerError struct{ DocDigitizerError }

// ServiceUnavailableError is returned for HTTP 503 responses.
type ServiceUnavailableError struct{ DocDigitizerError }

// TimeoutError is returned for HTTP 504 responses.
type TimeoutError struct{ DocDigitizerError }

func newBaseError(statusCode int, traceID string, messages []string, timers map[string]interface{}) DocDigitizerError {
	msg := fmt.Sprintf("HTTP %d", statusCode)
	if len(messages) > 0 {
		msg = strings.Join(messages, "; ")
	}
	return DocDigitizerError{
		Message:    msg,
		StatusCode: statusCode,
		TraceID:    traceID,
		Messages:   messages,
		Timers:     timers,
	}
}

// RaiseForStatus returns the appropriate error for a non-2xx status code.
func RaiseForStatus(statusCode int, traceID string, messages []string, timers map[string]interface{}) error {
	base := newBaseError(statusCode, traceID, messages, timers)
	switch statusCode {
	case 400:
		return &ValidationError{base}
	case 401:
		return &AuthenticationError{base}
	case 429:
		return &RateLimitError{base}
	case 500:
		return &ServerError{base}
	case 503:
		return &ServiceUnavailableError{base}
	case 504:
		return &TimeoutError{base}
	default:
		return &base
	}
}

// IsRetryable returns true if the status code is eligible for retry.
func IsRetryable(statusCode int) bool {
	switch statusCode {
	case 429, 500, 503, 504:
		return true
	default:
		return false
	}
}
