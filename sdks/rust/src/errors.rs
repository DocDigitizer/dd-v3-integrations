use std::collections::HashMap;
use thiserror::Error;

/// Base error type for all DocDigitizer SDK errors.
#[derive(Error, Debug)]
pub enum DocDigitizerError {
    #[error("{message}")]
    Validation {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("{message}")]
    Authentication {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("{message}")]
    RateLimit {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("{message}")]
    Server {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("{message}")]
    ServiceUnavailable {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("{message}")]
    Timeout {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("{message}")]
    Unknown {
        message: String,
        status_code: u16,
        trace_id: Option<String>,
        messages: Option<Vec<String>>,
        timers: Option<HashMap<String, serde_json::Value>>,
    },

    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Other(String),
}

/// Create the appropriate error for a non-2xx status code.
pub fn raise_for_status(
    status_code: u16,
    trace_id: Option<String>,
    messages: Option<Vec<String>>,
    timers: Option<HashMap<String, serde_json::Value>>,
) -> DocDigitizerError {
    let msg = messages
        .as_ref()
        .filter(|m| !m.is_empty())
        .map(|m| m.join("; "))
        .unwrap_or_else(|| format!("HTTP {}", status_code));

    match status_code {
        400 => DocDigitizerError::Validation { message: msg, status_code, trace_id, messages, timers },
        401 => DocDigitizerError::Authentication { message: msg, status_code, trace_id, messages, timers },
        429 => DocDigitizerError::RateLimit { message: msg, status_code, trace_id, messages, timers },
        500 => DocDigitizerError::Server { message: msg, status_code, trace_id, messages, timers },
        503 => DocDigitizerError::ServiceUnavailable { message: msg, status_code, trace_id, messages, timers },
        504 => DocDigitizerError::Timeout { message: msg, status_code, trace_id, messages, timers },
        _ => DocDigitizerError::Unknown { message: msg, status_code, trace_id, messages, timers },
    }
}

/// Returns true if the status code is eligible for retry.
pub fn is_retryable(status_code: u16) -> bool {
    matches!(status_code, 429 | 500 | 503 | 504)
}
