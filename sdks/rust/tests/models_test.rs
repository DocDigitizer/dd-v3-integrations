use docdigitizer::models::{parse_response, PageRange};
use serde_json::json;

#[test]
fn test_parse_response_camel_case() {
    let data = json!({
        "stateText": "COMPLETED",
        "traceId": "ABC1234",
        "pipeline": "MainPipelineWithOCR",
        "numberPages": 2,
        "output": {
            "extractions": [{
                "docType": "Invoice",
                "confidence": 0.95,
                "country": "PT",
                "pages": [1, 2],
                "extraction": { "DocumentNumber": "INV-001" },
                "schema": "Invoice_PT.json",
                "modelSource": "llm"
            }]
        },
        "timers": { "total": 2345.67 },
        "messages": ["Document processed successfully"]
    });

    let resp = parse_response(&data);
    assert_eq!(resp.state, "COMPLETED");
    assert_eq!(resp.trace_id, "ABC1234");
    assert_eq!(resp.pipeline, Some("MainPipelineWithOCR".to_string()));
    assert_eq!(resp.num_pages, Some(2));
    assert!(resp.is_completed());
    assert!(!resp.is_error());
    assert!(resp.timers.is_some());
    assert_eq!(resp.messages.as_ref().unwrap().len(), 1);

    let ext = &resp.extractions()[0];
    assert_eq!(ext.document_type, "Invoice");
    assert_eq!(ext.confidence, 0.95);
    assert_eq!(ext.country_code, "PT");
    assert_eq!(ext.pages, vec![1, 2]);
    assert_eq!(ext.page_range, Some(PageRange { start: 1, end: 2 }));
    assert_eq!(ext.schema, Some("Invoice_PT.json".to_string()));
    assert_eq!(ext.model_source, Some("llm".to_string()));
}

#[test]
fn test_parse_response_pascal_case() {
    let data = json!({
        "StateText": "COMPLETED",
        "TraceId": "ABC1234",
        "Pipeline": "MainPipelineWithOCR",
        "NumberPages": 2,
        "Output": {
            "extractions": [{
                "documentType": "Invoice",
                "confidence": 0.95,
                "countryCode": "PT",
                "pageRange": { "start": 1, "end": 2 },
                "extraction": { "DocumentNumber": "INV-001" }
            }]
        },
        "Messages": ["OK"]
    });

    let resp = parse_response(&data);
    assert_eq!(resp.state, "COMPLETED");
    assert_eq!(resp.trace_id, "ABC1234");

    let ext = &resp.extractions()[0];
    assert_eq!(ext.page_range, Some(PageRange { start: 1, end: 2 }));
}

#[test]
fn test_parse_response_empty() {
    let data = json!({
        "stateText": "COMPLETED",
        "traceId": "X"
    });
    let resp = parse_response(&data);
    assert_eq!(resp.state, "COMPLETED");
    assert!(resp.output.is_none());
    assert!(resp.extractions().is_empty());
}

#[test]
fn test_parse_response_error() {
    let data = json!({
        "stateText": "ERROR",
        "traceId": "ERR9876",
        "messages": ["File must be a PDF document"]
    });
    let resp = parse_response(&data);
    assert_eq!(resp.state, "ERROR");
    assert!(resp.is_error());
    assert_eq!(resp.messages.as_ref().unwrap()[0], "File must be a PDF document");
}

#[test]
fn test_parse_response_multiple_extractions() {
    let data = json!({
        "stateText": "COMPLETED",
        "traceId": "MULTI1",
        "output": {
            "extractions": [
                { "docType": "Invoice", "confidence": 0.9, "country": "PT", "pages": [1, 2], "extraction": {} },
                { "docType": "Receipt", "confidence": 0.85, "country": "ES", "pages": [3], "extraction": {} }
            ]
        }
    });
    let resp = parse_response(&data);
    assert_eq!(resp.extractions().len(), 2);
    assert_eq!(resp.extractions()[0].document_type, "Invoice");
    assert_eq!(resp.extractions()[1].document_type, "Receipt");
    assert_eq!(resp.extractions()[1].page_range, Some(PageRange { start: 3, end: 3 }));
}
