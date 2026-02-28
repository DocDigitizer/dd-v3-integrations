use std::env;
use std::time::Duration;

const DEFAULT_BASE_URL: &str = "https://apix.docdigitizer.com/sync";
const DEFAULT_TIMEOUT_MS: u64 = 300_000; // 5 minutes
const DEFAULT_MAX_RETRIES: u32 = 3;

/// Configuration for the DocDigitizer client.
#[derive(Debug, Clone)]
pub struct Config {
    pub api_key: String,
    pub base_url: String,
    pub timeout: Duration,
    pub max_retries: u32,
}

impl Config {
    /// Create a new Config with the given API key.
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            base_url: DEFAULT_BASE_URL.to_string(),
            timeout: Duration::from_millis(DEFAULT_TIMEOUT_MS),
            max_retries: DEFAULT_MAX_RETRIES,
        }
    }

    /// Set the base URL.
    pub fn base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into().trim_end_matches('/').to_string();
        self
    }

    /// Set the timeout.
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Set the max retries.
    pub fn max_retries(mut self, max_retries: u32) -> Self {
        self.max_retries = max_retries;
        self
    }

    /// Resolve configuration from explicit values and environment variables.
    pub fn from_env() -> Result<Self, String> {
        let api_key = env::var("DOCDIGITIZER_API_KEY")
            .map_err(|_| "API key is required. Set DOCDIGITIZER_API_KEY.".to_string())?;

        let base_url = env::var("DOCDIGITIZER_BASE_URL")
            .unwrap_or_else(|_| DEFAULT_BASE_URL.to_string())
            .trim_end_matches('/')
            .to_string();

        let timeout = env::var("DOCDIGITIZER_TIMEOUT")
            .ok()
            .and_then(|s| s.parse::<u64>().ok())
            .map(Duration::from_millis)
            .unwrap_or(Duration::from_millis(DEFAULT_TIMEOUT_MS));

        Ok(Self {
            api_key,
            base_url,
            timeout,
            max_retries: DEFAULT_MAX_RETRIES,
        })
    }
}
