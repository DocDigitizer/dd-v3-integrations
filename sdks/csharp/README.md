# DocDigitizer C# SDK

Official C# SDK for the [DocDigitizer](https://www.docdigitizer.com) document processing API.

## Installation

```bash
dotnet add package DocDigitizer
```

## Quick Start

```csharp
using DocDigitizer;

var dd = new DocDigitizerClient("your-api-key");

// Process a PDF
var result = await dd.ProcessAsync("/path/to/invoice.pdf");
Console.WriteLine(result.State);                              // "COMPLETED"
Console.WriteLine(result.Extractions[0].DocumentType);        // "Invoice"
Console.WriteLine(result.Extractions[0].ExtractionData);      // { DocumentNumber: "INV-001", ... }

// Health check
var status = await dd.HealthCheckAsync();
Console.WriteLine(status); // "I am alive"
```

## Configuration

```csharp
// Option 1: API key only
var dd = new DocDigitizerClient("your-api-key");

// Option 2: With options
var dd = new DocDigitizerClient("your-api-key",
    baseUrl: "https://apix.docdigitizer.com/sync",
    timeout: TimeSpan.FromMinutes(5),
    maxRetries: 3
);

// Option 3: Environment variables
// DOCDIGITIZER_API_KEY=your-api-key
var config = ClientConfig.Resolve();
var dd = new DocDigitizerClient(config);
```

## Processing Documents

```csharp
// From file path
var result = await dd.ProcessAsync("/path/to/document.pdf");

// From byte array
var bytes = await File.ReadAllBytesAsync("document.pdf");
var result = await dd.ProcessAsync(new ProcessOptions
{
    FileContent = bytes,
    FileName = "document.pdf"
});

// With options
var result = await dd.ProcessAsync(new ProcessOptions
{
    FilePath = "/path/to/document.pdf",
    PipelineIdentifier = "MainPipelineWithOCR",
    RequestToken = "my-trace-token"
});
```

## Error Handling

```csharp
try
{
    var result = await dd.ProcessAsync("invoice.pdf");
}
catch (AuthenticationException ex)
{
    Console.WriteLine($"Invalid API key: {ex.TraceId}");
}
catch (ValidationException ex)
{
    Console.WriteLine($"Invalid request: {string.Join(", ", ex.Messages!)}");
}
catch (DocDigitizerException ex)
{
    Console.WriteLine($"Error {ex.StatusCode}: {ex.Message}");
}
```

### Exception Types

| Exception | HTTP Status | Description |
|-----------|-------------|-------------|
| `ValidationException` | 400 | Invalid request |
| `AuthenticationException` | 401 | Invalid/missing API key |
| `RateLimitException` | 429 | Rate limit exceeded |
| `ServerException` | 500 | Internal server error |
| `ServiceUnavailableException` | 503 | Downstream service unavailable |
| `TimeoutException` | 504 | Processing timeout |

Retryable errors (429, 500, 503, 504) are automatically retried with exponential backoff.

## Requirements

- .NET 6.0+
- Zero external dependencies
