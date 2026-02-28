package docdigitizer

import (
	"testing"
)

func TestParseResponseCamelCase(t *testing.T) {
	data := map[string]interface{}{
		"stateText":   "COMPLETED",
		"traceId":     "ABC1234",
		"pipeline":    "MainPipelineWithOCR",
		"numberPages": float64(2),
		"output": map[string]interface{}{
			"extractions": []interface{}{
				map[string]interface{}{
					"docType":     "Invoice",
					"confidence":  0.95,
					"country":     "PT",
					"pages":       []interface{}{float64(1), float64(2)},
					"extraction":  map[string]interface{}{"DocumentNumber": "INV-001"},
					"schema":      "Invoice_PT.json",
					"modelSource": "llm",
				},
			},
		},
		"timers":   map[string]interface{}{"total": 2345.67},
		"messages": []interface{}{"Document processed successfully"},
	}

	resp := ParseResponse(data)

	if resp.State != "COMPLETED" {
		t.Errorf("expected COMPLETED, got %s", resp.State)
	}
	if resp.TraceID != "ABC1234" {
		t.Errorf("expected ABC1234, got %s", resp.TraceID)
	}
	if resp.Pipeline != "MainPipelineWithOCR" {
		t.Errorf("expected MainPipelineWithOCR, got %s", resp.Pipeline)
	}
	if resp.NumPages != 2 {
		t.Errorf("expected 2, got %d", resp.NumPages)
	}
	if !resp.IsCompleted() {
		t.Error("expected IsCompleted() to be true")
	}
	if resp.IsError() {
		t.Error("expected IsError() to be false")
	}

	if resp.Output == nil || len(resp.Output.Extractions) != 1 {
		t.Fatalf("expected 1 extraction")
	}

	ext := resp.Output.Extractions[0]
	if ext.DocumentType != "Invoice" {
		t.Errorf("expected Invoice, got %s", ext.DocumentType)
	}
	if ext.Confidence != 0.95 {
		t.Errorf("expected 0.95, got %f", ext.Confidence)
	}
	if ext.CountryCode != "PT" {
		t.Errorf("expected PT, got %s", ext.CountryCode)
	}
	if len(ext.Pages) != 2 {
		t.Errorf("expected 2 pages, got %d", len(ext.Pages))
	}
	if ext.PageRange == nil || ext.PageRange.Start != 1 || ext.PageRange.End != 2 {
		t.Errorf("expected pageRange {1, 2}, got %v", ext.PageRange)
	}
	if ext.Schema != "Invoice_PT.json" {
		t.Errorf("expected Invoice_PT.json, got %s", ext.Schema)
	}
	if ext.ModelSource != "llm" {
		t.Errorf("expected llm, got %s", ext.ModelSource)
	}
}

func TestParseResponsePascalCase(t *testing.T) {
	data := map[string]interface{}{
		"StateText":   "COMPLETED",
		"TraceId":     "ABC1234",
		"Pipeline":    "MainPipelineWithOCR",
		"NumberPages": float64(2),
		"Output": map[string]interface{}{
			"extractions": []interface{}{
				map[string]interface{}{
					"documentType": "Invoice",
					"confidence":   0.95,
					"countryCode":  "PT",
					"pageRange":    map[string]interface{}{"start": float64(1), "end": float64(2)},
					"extraction":   map[string]interface{}{"DocumentNumber": "INV-001"},
				},
			},
		},
		"Messages": []interface{}{"OK"},
	}

	resp := ParseResponse(data)
	if resp.State != "COMPLETED" {
		t.Errorf("expected COMPLETED, got %s", resp.State)
	}
	if resp.TraceID != "ABC1234" {
		t.Errorf("expected ABC1234, got %s", resp.TraceID)
	}
	if resp.Output == nil || len(resp.Output.Extractions) != 1 {
		t.Fatalf("expected 1 extraction")
	}
	ext := resp.Output.Extractions[0]
	if ext.PageRange == nil || ext.PageRange.Start != 1 || ext.PageRange.End != 2 {
		t.Errorf("expected pageRange {1, 2}, got %v", ext.PageRange)
	}
}

func TestParseResponseEmpty(t *testing.T) {
	data := map[string]interface{}{
		"stateText": "COMPLETED",
		"traceId":   "X",
	}
	resp := ParseResponse(data)
	if resp.Output != nil {
		t.Error("expected nil output")
	}
}

func TestParseResponseError(t *testing.T) {
	data := map[string]interface{}{
		"stateText": "ERROR",
		"traceId":   "ERR9876",
		"messages":  []interface{}{"File must be a PDF document"},
	}
	resp := ParseResponse(data)
	if resp.State != "ERROR" {
		t.Errorf("expected ERROR, got %s", resp.State)
	}
	if !resp.IsError() {
		t.Error("expected IsError() to be true")
	}
	if len(resp.Messages) != 1 || resp.Messages[0] != "File must be a PDF document" {
		t.Errorf("unexpected messages: %v", resp.Messages)
	}
}

func TestParseResponseMultipleExtractions(t *testing.T) {
	data := map[string]interface{}{
		"stateText": "COMPLETED",
		"traceId":   "MULTI1",
		"output": map[string]interface{}{
			"extractions": []interface{}{
				map[string]interface{}{
					"docType":    "Invoice",
					"confidence": 0.9,
					"country":    "PT",
					"pages":      []interface{}{float64(1), float64(2)},
					"extraction": map[string]interface{}{},
				},
				map[string]interface{}{
					"docType":    "Receipt",
					"confidence": 0.85,
					"country":    "ES",
					"pages":      []interface{}{float64(3)},
					"extraction": map[string]interface{}{},
				},
			},
		},
	}
	resp := ParseResponse(data)
	if resp.Output == nil || len(resp.Output.Extractions) != 2 {
		t.Fatalf("expected 2 extractions")
	}
	if resp.Output.Extractions[0].DocumentType != "Invoice" {
		t.Errorf("expected Invoice, got %s", resp.Output.Extractions[0].DocumentType)
	}
	if resp.Output.Extractions[1].DocumentType != "Receipt" {
		t.Errorf("expected Receipt, got %s", resp.Output.Extractions[1].DocumentType)
	}
	if resp.Output.Extractions[1].PageRange == nil || resp.Output.Extractions[1].PageRange.Start != 3 {
		t.Errorf("expected pageRange start 3")
	}
}
