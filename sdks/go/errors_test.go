package docdigitizer

import (
	"errors"
	"testing"
)

func TestRaiseForStatus(t *testing.T) {
	tests := []struct {
		code     int
		errType  interface{}
		typeName string
	}{
		{400, &ValidationError{}, "ValidationError"},
		{401, &AuthenticationError{}, "AuthenticationError"},
		{429, &RateLimitError{}, "RateLimitError"},
		{500, &ServerError{}, "ServerError"},
		{503, &ServiceUnavailableError{}, "ServiceUnavailableError"},
		{504, &TimeoutError{}, "TimeoutError"},
	}

	for _, tt := range tests {
		err := RaiseForStatus(tt.code, "TRACE1", []string{"error msg"}, nil)
		if err == nil {
			t.Fatalf("expected error for status %d, got nil", tt.code)
		}

		switch tt.code {
		case 400:
			var target *ValidationError
			if !errors.As(err, &target) {
				t.Errorf("status %d: expected %s, got %T", tt.code, tt.typeName, err)
			}
		case 401:
			var target *AuthenticationError
			if !errors.As(err, &target) {
				t.Errorf("status %d: expected %s, got %T", tt.code, tt.typeName, err)
			}
		case 429:
			var target *RateLimitError
			if !errors.As(err, &target) {
				t.Errorf("status %d: expected %s, got %T", tt.code, tt.typeName, err)
			}
		case 500:
			var target *ServerError
			if !errors.As(err, &target) {
				t.Errorf("status %d: expected %s, got %T", tt.code, tt.typeName, err)
			}
		case 503:
			var target *ServiceUnavailableError
			if !errors.As(err, &target) {
				t.Errorf("status %d: expected %s, got %T", tt.code, tt.typeName, err)
			}
		case 504:
			var target *TimeoutError
			if !errors.As(err, &target) {
				t.Errorf("status %d: expected %s, got %T", tt.code, tt.typeName, err)
			}
		}
	}
}

func TestRaiseForStatusUnknownCode(t *testing.T) {
	err := RaiseForStatus(418, "", nil, nil)
	var base *DocDigitizerError
	if !errors.As(err, &base) {
		t.Fatalf("expected *DocDigitizerError, got %T", err)
	}
	if base.StatusCode != 418 {
		t.Errorf("expected status 418, got %d", base.StatusCode)
	}
}

func TestRaiseForStatusMessage(t *testing.T) {
	err := RaiseForStatus(400, "", []string{"err1", "err2"}, nil)
	if err.Error() != "err1; err2" {
		t.Errorf("expected joined message, got: %s", err.Error())
	}
}

func TestRaiseForStatusDefaultMessage(t *testing.T) {
	err := RaiseForStatus(500, "", nil, nil)
	if err.Error() != "HTTP 500" {
		t.Errorf("expected 'HTTP 500', got: %s", err.Error())
	}
}

func TestIsRetryable(t *testing.T) {
	retryable := []int{429, 500, 503, 504}
	nonRetryable := []int{400, 401, 403, 404, 418}

	for _, code := range retryable {
		if !IsRetryable(code) {
			t.Errorf("expected %d to be retryable", code)
		}
	}
	for _, code := range nonRetryable {
		if IsRetryable(code) {
			t.Errorf("expected %d to NOT be retryable", code)
		}
	}
}

func TestErrorCarriesFields(t *testing.T) {
	err := RaiseForStatus(401, "TRACE1", []string{"bad key"}, map[string]interface{}{"total": 1.0})
	var authErr *AuthenticationError
	if !errors.As(err, &authErr) {
		t.Fatalf("expected AuthenticationError")
	}
	if authErr.TraceID != "TRACE1" {
		t.Errorf("expected traceID TRACE1, got %s", authErr.TraceID)
	}
	if len(authErr.Messages) != 1 || authErr.Messages[0] != "bad key" {
		t.Errorf("unexpected messages: %v", authErr.Messages)
	}
}
