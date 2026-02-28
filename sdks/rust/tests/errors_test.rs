use docdigitizer::errors::{raise_for_status, is_retryable, DocDigitizerError};

#[test]
fn test_raise_for_status_400() {
    let err = raise_for_status(400, Some("T1".into()), Some(vec!["bad request".into()]), None);
    assert!(matches!(err, DocDigitizerError::Validation { .. }));
    assert_eq!(err.to_string(), "bad request");
}

#[test]
fn test_raise_for_status_401() {
    let err = raise_for_status(401, None, None, None);
    assert!(matches!(err, DocDigitizerError::Authentication { .. }));
    assert_eq!(err.to_string(), "HTTP 401");
}

#[test]
fn test_raise_for_status_429() {
    let err = raise_for_status(429, None, None, None);
    assert!(matches!(err, DocDigitizerError::RateLimit { .. }));
}

#[test]
fn test_raise_for_status_500() {
    let err = raise_for_status(500, None, None, None);
    assert!(matches!(err, DocDigitizerError::Server { .. }));
}

#[test]
fn test_raise_for_status_503() {
    let err = raise_for_status(503, None, None, None);
    assert!(matches!(err, DocDigitizerError::ServiceUnavailable { .. }));
}

#[test]
fn test_raise_for_status_504() {
    let err = raise_for_status(504, None, None, None);
    assert!(matches!(err, DocDigitizerError::Timeout { .. }));
}

#[test]
fn test_raise_for_status_unknown() {
    let err = raise_for_status(418, None, None, None);
    assert!(matches!(err, DocDigitizerError::Unknown { .. }));
}

#[test]
fn test_raise_for_status_joins_messages() {
    let err = raise_for_status(400, None, Some(vec!["err1".into(), "err2".into()]), None);
    assert_eq!(err.to_string(), "err1; err2");
}

#[test]
fn test_is_retryable() {
    assert!(is_retryable(429));
    assert!(is_retryable(500));
    assert!(is_retryable(503));
    assert!(is_retryable(504));
    assert!(!is_retryable(400));
    assert!(!is_retryable(401));
    assert!(!is_retryable(404));
}

#[test]
fn test_error_carries_fields() {
    let err = raise_for_status(401, Some("TRACE1".into()), Some(vec!["bad key".into()]), None);
    match err {
        DocDigitizerError::Authentication { trace_id, messages, .. } => {
            assert_eq!(trace_id, Some("TRACE1".to_string()));
            assert_eq!(messages, Some(vec!["bad key".to_string()]));
        }
        _ => panic!("expected Authentication error"),
    }
}
