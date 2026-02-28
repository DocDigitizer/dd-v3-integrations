use std::path::Path;
use std::time::Duration;

use reqwest::multipart;
use serde_json::Value;
use tokio::fs;

use crate::config::Config;
use crate::errors::{raise_for_status, is_retryable, DocDigitizerError};
use crate::models::{parse_response, ProcessingResponse};

/// Options for document processing.
pub struct ProcessOptions {
    /// Path to a PDF file on disk.
    pub file_path: Option<String>,
    /// PDF file as bytes.
    pub file_content: Option<Vec<u8>>,
    /// Override the file name sent to the API.
    pub file_name: Option<String>,
    /// Document UUID (auto-generated if None).
    pub id: Option<String>,
    /// Context UUID for grouping documents (auto-generated if None).
    pub context_id: Option<String>,
    /// Pipeline name to use for processing.
    pub pipeline_identifier: Option<String>,
    /// Trace token for distributed tracing.
    pub request_token: Option<String>,
}

impl Default for ProcessOptions {
    fn default() -> Self {
        Self {
            file_path: None,
            file_content: None,
            file_name: None,
            id: None,
            context_id: None,
            pipeline_identifier: None,
            request_token: None,
        }
    }
}

/// DocDigitizer API client.
pub struct DocDigitizer {
    config: Config,
    http: reqwest::Client,
}

impl DocDigitizer {
    /// Create a new client with the given API key.
    pub fn new(api_key: impl Into<String>) -> Self {
        let config = Config::new(api_key);
        let http = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("failed to build HTTP client");
        Self { config, http }
    }

    /// Create a new client with the given configuration.
    pub fn with_config(config: Config) -> Self {
        let http = reqwest::Client::builder()
            .timeout(config.timeout)
            .build()
            .expect("failed to build HTTP client");
        Self { config, http }
    }

    /// Create a new client from environment variables.
    pub fn from_env() -> Result<Self, String> {
        let config = Config::from_env()?;
        Ok(Self::with_config(config))
    }

    /// Check if the API is healthy and responsive.
    pub async fn health_check(&self) -> Result<String, DocDigitizerError> {
        let url = format!("{}/", self.config.base_url);
        let response = self.http.get(&url).send().await?;

        let status = response.status().as_u16();
        if status >= 400 {
            return Err(raise_for_status(status, None, None, None));
        }

        Ok(response.text().await?)
    }

    /// Process a PDF file from a path.
    pub async fn process(&self, file_path: &str) -> Result<ProcessingResponse, DocDigitizerError> {
        self.process_with_options(ProcessOptions {
            file_path: Some(file_path.to_string()),
            ..Default::default()
        })
        .await
    }

    /// Process a PDF document with options.
    pub async fn process_with_options(
        &self,
        options: ProcessOptions,
    ) -> Result<ProcessingResponse, DocDigitizerError> {
        let (file_content, file_name) = if let Some(ref path) = options.file_path {
            let content = fs::read(path).await?;
            let name = options.file_name.clone().unwrap_or_else(|| {
                Path::new(path)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string()
            });
            (content, name)
        } else if let Some(content) = options.file_content {
            let name = options.file_name.unwrap_or_else(|| "document.pdf".to_string());
            (content, name)
        } else {
            return Err(DocDigitizerError::Other(
                "Either file_path or file_content is required.".to_string(),
            ));
        };

        let id = options.id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let context_id = options.context_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        self.execute_with_retry(
            file_content,
            file_name,
            id,
            context_id,
            options.pipeline_identifier,
            options.request_token,
        )
        .await
    }

    async fn execute_with_retry(
        &self,
        file_content: Vec<u8>,
        file_name: String,
        id: String,
        context_id: String,
        pipeline: Option<String>,
        request_token: Option<String>,
    ) -> Result<ProcessingResponse, DocDigitizerError> {
        let mut last_error: Option<DocDigitizerError> = None;

        for attempt in 0..=self.config.max_retries {
            if attempt > 0 {
                let delay_ms = std::cmp::min(1000 * 2u64.pow(attempt - 1), 30_000);
                tokio::time::sleep(Duration::from_millis(delay_ms)).await;
            }

            let part = multipart::Part::bytes(file_content.clone())
                .file_name(file_name.clone())
                .mime_str("application/pdf")
                .unwrap();

            let mut form = multipart::Form::new()
                .part("files", part)
                .text("id", id.clone())
                .text("contextID", context_id.clone());

            if let Some(ref p) = pipeline {
                form = form.text("pipelineIdentifier", p.clone());
            }
            if let Some(ref t) = request_token {
                form = form.text("requestToken", t.clone());
            }

            let url = format!("{}/", self.config.base_url);
            let response = self
                .http
                .post(&url)
                .header("X-API-Key", &self.config.api_key)
                .multipart(form)
                .send()
                .await?;

            let status = response.status().as_u16();
            let body_text = response.text().await.unwrap_or_default();
            let body: Value = serde_json::from_str(&body_text).unwrap_or(Value::Object(Default::default()));

            if status >= 400 {
                let obj = body.as_object();
                let trace_id = obj
                    .and_then(|o| o.get("traceId").or_else(|| o.get("TraceId")))
                    .and_then(|v| v.as_str())
                    .map(String::from);
                let messages = obj
                    .and_then(|o| o.get("messages").or_else(|| o.get("Messages")))
                    .and_then(|v| v.as_array())
                    .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect());

                if is_retryable(status) && attempt < self.config.max_retries {
                    last_error = Some(raise_for_status(status, trace_id, messages, None));
                    continue;
                }

                return Err(raise_for_status(status, trace_id, messages, None));
            }

            return Ok(parse_response(&body));
        }

        Err(last_error.unwrap_or_else(|| DocDigitizerError::Other("Request failed after retries".to_string())))
    }
}
