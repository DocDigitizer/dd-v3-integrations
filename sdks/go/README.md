# DocDigitizer Go SDK

Official Go SDK for the [DocDigitizer](https://www.docdigitizer.com) document processing API.

## Installation

```bash
go get github.com/DocDigitizer/dd-v3-integrations/sdks/go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    dd "github.com/DocDigitizer/dd-v3-integrations/sdks/go"
)

func main() {
    client, err := dd.New("your-api-key")
    if err != nil {
        log.Fatal(err)
    }

    ctx := context.Background()

    // Process a PDF
    result, err := client.ProcessFile(ctx, "/path/to/invoice.pdf")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(result.State)                              // "COMPLETED"
    fmt.Println(result.Output.Extractions[0].DocumentType) // "Invoice"

    // Health check
    status, err := client.HealthCheck(ctx)
    if err != nil {
        log.Fatal(err)
    }
    fmt.Println(status) // "I am alive"
}
```

## Configuration

```go
// Option 1: API key as argument
client, _ := dd.New("your-api-key")

// Option 2: With options
client, _ := dd.New("your-api-key",
    dd.WithBaseURL("https://apix.docdigitizer.com/sync"),
    dd.WithTimeout(5 * time.Minute),
    dd.WithMaxRetries(3),
)

// Option 3: From environment
// DOCDIGITIZER_API_KEY=your-api-key
client, _ := dd.New("")
```

## Error Handling

```go
import "errors"

result, err := client.ProcessFile(ctx, "invoice.pdf")
if err != nil {
    var authErr *dd.AuthenticationError
    var valErr *dd.ValidationError
    switch {
    case errors.As(err, &authErr):
        fmt.Println("Invalid API key")
    case errors.As(err, &valErr):
        fmt.Println("Invalid request:", valErr.Messages)
    default:
        fmt.Println("Error:", err)
    }
}
```

### Error Types

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `ValidationError` | 400 | Invalid request |
| `AuthenticationError` | 401 | Invalid/missing API key |
| `RateLimitError` | 429 | Rate limit exceeded |
| `ServerError` | 500 | Internal server error |
| `ServiceUnavailableError` | 503 | Downstream service unavailable |
| `TimeoutError` | 504 | Processing timeout |

Retryable errors (429, 500, 503, 504) are automatically retried with exponential backoff.

## Requirements

- Go 1.21+
- Only stdlib dependencies (net/http)
