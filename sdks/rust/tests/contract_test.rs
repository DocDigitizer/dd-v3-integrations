use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
}

fn load_yaml(path: &std::path::Path) -> serde_yaml::Value {
    let content = fs::read_to_string(path).expect(&format!("failed to read {:?}", path));
    serde_yaml::from_str(&content).expect("failed to parse YAML")
}

#[test]
fn test_manifest_operations_exist_in_spec() {
    let root = repo_root();
    let spec = load_yaml(&root.join("openapi").join("sync.openapi.yaml"));
    let manifest = load_yaml(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sdk-manifest.yaml"));

    // Collect all operationIds from spec
    let mut spec_ops: Vec<String> = Vec::new();
    if let Some(paths) = spec.get("paths").and_then(|v| v.as_mapping()) {
        for (_path, methods) in paths {
            if let Some(method_map) = methods.as_mapping() {
                for (_method, operation) in method_map {
                    if let Some(op_id) = operation.get("operationId").and_then(|v| v.as_str()) {
                        spec_ops.push(op_id.to_string());
                    }
                }
            }
        }
    }

    // Verify manifest operations exist in spec
    if let Some(operations) = manifest.get("operations").and_then(|v| v.as_sequence()) {
        for op in operations {
            let op_id = op.get("operationId").and_then(|v| v.as_str()).unwrap();
            assert!(
                spec_ops.contains(&op_id.to_string()),
                "manifest operationId '{}' not found in OpenAPI spec. Available: {:?}",
                op_id,
                spec_ops
            );
        }
    }
}

#[test]
fn test_api_version_matches() {
    let root = repo_root();
    let spec = load_yaml(&root.join("openapi").join("sync.openapi.yaml"));
    let manifest = load_yaml(&PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("sdk-manifest.yaml"));

    let spec_version = spec["info"]["version"].as_str().unwrap();
    let manifest_version = manifest["sdk"]["api_version"].as_str().unwrap();
    assert_eq!(spec_version, manifest_version);
}

#[test]
fn test_processing_response_schema_has_required_fields() {
    let root = repo_root();
    let spec = load_yaml(&root.join("openapi").join("sync.openapi.yaml"));

    let required = spec["components"]["schemas"]["ProcessingResponse"]["required"]
        .as_sequence()
        .unwrap();
    let required_strs: Vec<&str> = required.iter().filter_map(|v| v.as_str()).collect();

    assert!(required_strs.contains(&"StateText"));
    assert!(required_strs.contains(&"TraceId"));
}

#[test]
fn test_extraction_schema_has_expected_properties() {
    let root = repo_root();
    let spec = load_yaml(&root.join("openapi").join("sync.openapi.yaml"));

    let properties = spec["components"]["schemas"]["Extraction"]["properties"]
        .as_mapping()
        .unwrap();

    let props: Vec<&str> = properties
        .keys()
        .filter_map(|k| k.as_str())
        .collect();

    assert!(props.contains(&"documentType"));
    assert!(props.contains(&"confidence"));
    assert!(props.contains(&"countryCode"));
    assert!(props.contains(&"pageRange"));
    assert!(props.contains(&"extraction"));
}
