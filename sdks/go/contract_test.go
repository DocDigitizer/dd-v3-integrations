package docdigitizer

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"gopkg.in/yaml.v3"
)

func testdataPath(relPath string) string {
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	return filepath.Join(dir, relPath)
}

func loadYAML(t *testing.T, path string) map[string]interface{} {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Skipf("file not found: %s", path)
	}
	var result map[string]interface{}
	if err := yaml.Unmarshal(data, &result); err != nil {
		t.Fatalf("failed to parse YAML: %v", err)
	}
	return result
}

func TestManifestOperationsExistInSpec(t *testing.T) {
	specPath := testdataPath(filepath.Join("..", "..", "openapi", "sync.openapi.yaml"))
	manifestPath := testdataPath("sdk-manifest.yaml")

	spec := loadYAML(t, specPath)
	manifest := loadYAML(t, manifestPath)

	// Collect all operationIds from spec
	specOps := make(map[string]bool)
	if paths, ok := spec["paths"].(map[string]interface{}); ok {
		for _, methods := range paths {
			if methodMap, ok := methods.(map[string]interface{}); ok {
				for _, operation := range methodMap {
					if opMap, ok := operation.(map[string]interface{}); ok {
						if opID, ok := opMap["operationId"].(string); ok {
							specOps[opID] = true
						}
					}
				}
			}
		}
	}

	// Verify all manifest operations exist in spec
	if operations, ok := manifest["operations"].([]interface{}); ok {
		for _, op := range operations {
			if opMap, ok := op.(map[string]interface{}); ok {
				opID := opMap["operationId"].(string)
				if !specOps[opID] {
					t.Errorf("manifest operationId '%s' not found in OpenAPI spec", opID)
				}
			}
		}
	}
}

func TestAPIVersionMatches(t *testing.T) {
	specPath := testdataPath(filepath.Join("..", "..", "openapi", "sync.openapi.yaml"))
	manifestPath := testdataPath("sdk-manifest.yaml")

	spec := loadYAML(t, specPath)
	manifest := loadYAML(t, manifestPath)

	specInfo := spec["info"].(map[string]interface{})
	sdkInfo := manifest["sdk"].(map[string]interface{})

	if sdkInfo["api_version"] != specInfo["version"] {
		t.Errorf("api_version mismatch: manifest=%v, spec=%v", sdkInfo["api_version"], specInfo["version"])
	}
}

func TestProcessingResponseSchemaHasRequiredFields(t *testing.T) {
	specPath := testdataPath(filepath.Join("..", "..", "openapi", "sync.openapi.yaml"))
	spec := loadYAML(t, specPath)

	components := spec["components"].(map[string]interface{})
	schemas := components["schemas"].(map[string]interface{})
	responseSchema := schemas["ProcessingResponse"].(map[string]interface{})
	required := responseSchema["required"].([]interface{})

	requiredSet := make(map[string]bool)
	for _, r := range required {
		requiredSet[r.(string)] = true
	}
	if !requiredSet["StateText"] {
		t.Error("expected StateText to be required")
	}
	if !requiredSet["TraceId"] {
		t.Error("expected TraceId to be required")
	}
}

func TestExtractionSchemaHasExpectedProperties(t *testing.T) {
	specPath := testdataPath(filepath.Join("..", "..", "openapi", "sync.openapi.yaml"))
	spec := loadYAML(t, specPath)

	components := spec["components"].(map[string]interface{})
	schemas := components["schemas"].(map[string]interface{})
	extractionSchema := schemas["Extraction"].(map[string]interface{})
	properties := extractionSchema["properties"].(map[string]interface{})

	expected := []string{"documentType", "confidence", "countryCode", "pageRange", "extraction"}
	for _, prop := range expected {
		if _, ok := properties[prop]; !ok {
			t.Errorf("expected Extraction schema to have property '%s'", prop)
		}
	}
}
