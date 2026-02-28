# DocDigitizer Rust SDK

Official Rust SDK for the [DocDigitizer](https://www.docdigitizer.com) document processing API.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
docdigitizer = "0.1"
tokio = { version = "1", features = ["full"] }
```

## Quick Start

```rust
use docdigitizer::DocDigitizer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let dd = DocDigitizer::new("your-api-key");

    // Process a PDF
    let result = dd.process("/path/to/invoice.pdf").await?;
    println!("{}", result.state);                              // "COMPLETED"
    println!("{}", result.extractions()[0].document_type);     // "Invoice"

    // Health check
    let status = dd.health_check().await?;
    println!("{}", status); // "I am alive"

    Ok(())
}
```

## Configuration

```rust
use docdigitizer::{DocDigitizer, Config};
use std::time::Duration;

// Option 1: API key only
let dd = DocDigitizer::new("your-api-key");

// Option 2: With config
let config = Config::new("your-api-key")
    .base_url("https://apix.docdigitizer.com/sync")
    .timeout(Duration::from_secs(300))
    .max_retries(3);
let dd = DocDigitizer::with_config(config);

// Option 3: From environment
// DOCDIGITIZER_API_KEY=your-api-key
let dd = DocDigitizer::from_env()?;
```

## Processing Documents

```rust
use docdigitizer::{DocDigitizer, ProcessOptions};

let dd = DocDigitizer::new("your-api-key");

// From file path
let result = dd.process("document.pdf").await?;

// From bytes
let bytes = std::fs::read("document.pdf")?;
let result = dd.process_with_options(ProcessOptions {
    file_content: Some(bytes),
    file_name: Some("document.pdf".to_string()),
    ..Default::default()
}).await?;

// With options
let result = dd.process_with_options(ProcessOptions {
    file_path: Some("document.pdf".to_string()),
    pipeline_identifier: Some("MainPipelineWithOCR".to_string()),
    ..Default::default()
}).await?;
```

## Error Handling

```rust
use docdigitizer::{DocDigitizer, DocDigitizerError};

let dd = DocDigitizer::new("your-api-key");
match dd.process("invoice.pdf").await {
    Ok(result) => println!("Success: {}", result.state),
    Err(DocDigitizerError::Authentication { .. }) => println!("Invalid API key"),
    Err(DocDigitizerError::Validation { messages, .. }) => {
        println!("Invalid request: {:?}", messages);
    }
    Err(e) => println!("Error: {}", e),
}
```

### Error Variants

| Variant | HTTP Status | Description |
|---------|-------------|-------------|
| `Validation` | 400 | Invalid request |
| `Authentication` | 401 | Invalid/missing API key |
| `RateLimit` | 429 | Rate limit exceeded |
| `Server` | 500 | Internal server error |
| `ServiceUnavailable` | 503 | Downstream service unavailable |
| `Timeout` | 504 | Processing timeout |

Retryable errors (429, 500, 503, 504) are automatically retried with exponential backoff.

## Requirements

- Rust 1.70+
- tokio runtime
