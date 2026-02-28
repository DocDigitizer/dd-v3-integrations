pub mod client;
pub mod config;
pub mod errors;
pub mod models;

pub use client::{DocDigitizer, ProcessOptions};
pub use config::Config;
pub use errors::DocDigitizerError;
pub use models::{
    parse_response, Extraction, PageRange, ProcessingOutput, ProcessingResponse,
};
