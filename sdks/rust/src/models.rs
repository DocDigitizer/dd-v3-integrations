use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PageRange {
    pub start: i32,
    pub end: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Extraction {
    pub document_type: String,
    pub confidence: f64,
    pub country_code: String,
    pub pages: Vec<i32>,
    pub page_range: Option<PageRange>,
    pub extraction: HashMap<String, Value>,
    pub schema: Option<String>,
    pub model_source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingOutput {
    pub extractions: Vec<Extraction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingResponse {
    pub state: String,
    pub trace_id: String,
    pub pipeline: Option<String>,
    pub num_pages: Option<i32>,
    pub output: Option<ProcessingOutput>,
    pub timers: Option<HashMap<String, Value>>,
    pub messages: Option<Vec<String>>,
}

impl ProcessingResponse {
    pub fn is_completed(&self) -> bool {
        self.state == "COMPLETED"
    }

    pub fn is_error(&self) -> bool {
        self.state == "ERROR"
    }

    pub fn extractions(&self) -> &[Extraction] {
        self.output.as_ref().map_or(&[], |o| &o.extractions)
    }
}

/// Dual-case getter: tries camelCase first, then PascalCase fallback.
fn get_str(data: &serde_json::Map<String, Value>, camel: &str, pascal: &str) -> String {
    data.get(camel)
        .or_else(|| data.get(pascal))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

fn get_val<'a>(data: &'a serde_json::Map<String, Value>, camel: &str, pascal: &str) -> Option<&'a Value> {
    data.get(camel).or_else(|| data.get(pascal))
}

fn parse_extraction(raw: &serde_json::Map<String, Value>) -> Extraction {
    let pages: Vec<i32> = raw
        .get("pages")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_i64().map(|n| n as i32))
                .collect()
        })
        .unwrap_or_default();

    let page_range = if let Some(pr) = raw.get("pageRange").and_then(|v| v.as_object()) {
        Some(PageRange {
            start: pr.get("start").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            end: pr.get("end").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
        })
    } else if !pages.is_empty() {
        Some(PageRange {
            start: *pages.iter().min().unwrap(),
            end: *pages.iter().max().unwrap(),
        })
    } else {
        None
    };

    let document_type = raw
        .get("docType")
        .or_else(|| raw.get("documentType"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let country_code = raw
        .get("country")
        .or_else(|| raw.get("countryCode"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let confidence = raw
        .get("confidence")
        .and_then(|v| v.as_f64())
        .unwrap_or(0.0);

    let extraction = raw
        .get("extraction")
        .and_then(|v| v.as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
        .unwrap_or_default();

    let schema = raw.get("schema").and_then(|v| v.as_str()).map(String::from);
    let model_source = raw.get("modelSource").and_then(|v| v.as_str()).map(String::from);

    Extraction {
        document_type,
        confidence,
        country_code,
        pages,
        page_range,
        extraction,
        schema,
        model_source,
    }
}

/// Parse a raw JSON value into a ProcessingResponse.
/// Handles both camelCase (actual API) and PascalCase (OpenAPI spec) keys.
pub fn parse_response(data: &Value) -> ProcessingResponse {
    let obj = data.as_object().expect("expected JSON object");

    let state = get_str(obj, "stateText", "StateText");
    let trace_id = get_str(obj, "traceId", "TraceId");
    let pipeline = get_val(obj, "pipeline", "Pipeline")
        .and_then(|v| v.as_str())
        .map(String::from);
    let num_pages = get_val(obj, "numberPages", "NumberPages")
        .and_then(|v| v.as_i64())
        .map(|n| n as i32);
    let timers = get_val(obj, "timers", "Timers")
        .and_then(|v| v.as_object())
        .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect());
    let messages = get_val(obj, "messages", "Messages")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        });

    let output = get_val(obj, "output", "Output")
        .and_then(|v| v.as_object())
        .map(|output_obj| {
            let extractions = output_obj
                .get("extractions")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_object().map(parse_extraction))
                        .collect()
                })
                .unwrap_or_default();
            ProcessingOutput { extractions }
        });

    ProcessingResponse {
        state,
        trace_id,
        pipeline,
        num_pages,
        output,
        timers,
        messages,
    }
}
