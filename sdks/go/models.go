package docdigitizer

import "math"

// PageRange represents a page range within the PDF.
type PageRange struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

// Extraction represents extracted data from a single document segment.
type Extraction struct {
	DocumentType string                 `json:"documentType"`
	Confidence   float64                `json:"confidence"`
	CountryCode  string                 `json:"countryCode"`
	Pages        []int                  `json:"pages"`
	PageRange    *PageRange             `json:"pageRange,omitempty"`
	Extraction   map[string]interface{} `json:"extraction"`
	Schema       string                 `json:"schema,omitempty"`
	ModelSource  string                 `json:"modelSource,omitempty"`
}

// ProcessingOutput is the container for extraction results.
type ProcessingOutput struct {
	Extractions []Extraction `json:"extractions"`
}

// ProcessingResponse is the response returned when a document is processed.
type ProcessingResponse struct {
	State    string                 `json:"state"`
	TraceID  string                 `json:"traceId"`
	Pipeline string                 `json:"pipeline,omitempty"`
	NumPages int                    `json:"numPages,omitempty"`
	Output   *ProcessingOutput      `json:"output,omitempty"`
	Timers   map[string]interface{} `json:"timers,omitempty"`
	Messages []string               `json:"messages,omitempty"`
}

// IsCompleted returns true if the processing state is COMPLETED.
func (r *ProcessingResponse) IsCompleted() bool {
	return r.State == "COMPLETED"
}

// IsError returns true if the processing state is ERROR.
func (r *ProcessingResponse) IsError() bool {
	return r.State == "ERROR"
}

// getStr tries camelCase key first, then PascalCase fallback.
func getStr(data map[string]interface{}, camel, pascal, fallback string) string {
	if v, ok := data[camel]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	if v, ok := data[pascal]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return fallback
}

func getVal(data map[string]interface{}, camel, pascal string) interface{} {
	if v, ok := data[camel]; ok {
		return v
	}
	if v, ok := data[pascal]; ok {
		return v
	}
	return nil
}

func toFloat(v interface{}) float64 {
	switch n := v.(type) {
	case float64:
		return n
	case int:
		return float64(n)
	case int64:
		return float64(n)
	default:
		return 0
	}
}

func toInt(v interface{}) int {
	switch n := v.(type) {
	case float64:
		return int(n)
	case int:
		return n
	case int64:
		return int(n)
	default:
		return 0
	}
}

func toStringSlice(v interface{}) []string {
	if v == nil {
		return nil
	}
	arr, ok := v.([]interface{})
	if !ok {
		return nil
	}
	result := make([]string, 0, len(arr))
	for _, item := range arr {
		if s, ok := item.(string); ok {
			result = append(result, s)
		}
	}
	return result
}

func toMap(v interface{}) map[string]interface{} {
	if v == nil {
		return nil
	}
	if m, ok := v.(map[string]interface{}); ok {
		return m
	}
	return nil
}

func parseExtraction(raw map[string]interface{}) Extraction {
	pages := make([]int, 0)
	if pagesRaw, ok := raw["pages"].([]interface{}); ok {
		for _, p := range pagesRaw {
			pages = append(pages, toInt(p))
		}
	}

	var pageRange *PageRange
	if prRaw := toMap(raw["pageRange"]); prRaw != nil {
		pageRange = &PageRange{
			Start: toInt(prRaw["start"]),
			End:   toInt(prRaw["end"]),
		}
	} else if len(pages) > 0 {
		minP, maxP := math.MaxInt32, 0
		for _, p := range pages {
			if p < minP {
				minP = p
			}
			if p > maxP {
				maxP = p
			}
		}
		pageRange = &PageRange{Start: minP, End: maxP}
	}

	return Extraction{
		DocumentType: getStr(raw, "docType", "documentType", ""),
		Confidence:   toFloat(raw["confidence"]),
		CountryCode:  getStr(raw, "country", "countryCode", ""),
		Pages:        pages,
		PageRange:    pageRange,
		Extraction:   toMap(raw["extraction"]),
		Schema: func() string {
			if v, ok := raw["schema"].(string); ok {
				return v
			}
			return ""
		}(),
		ModelSource: func() string {
			if v, ok := raw["modelSource"].(string); ok {
				return v
			}
			return ""
		}(),
	}
}

// ParseResponse parses a raw JSON map into a ProcessingResponse.
// Handles both camelCase (actual API) and PascalCase (OpenAPI spec) keys.
func ParseResponse(data map[string]interface{}) *ProcessingResponse {
	resp := &ProcessingResponse{
		State:    getStr(data, "stateText", "StateText", ""),
		TraceID:  getStr(data, "traceId", "TraceId", ""),
		Pipeline: getStr(data, "pipeline", "Pipeline", ""),
		Messages: toStringSlice(getVal(data, "messages", "Messages")),
		Timers:   toMap(getVal(data, "timers", "Timers")),
	}

	if np := getVal(data, "numberPages", "NumberPages"); np != nil {
		resp.NumPages = toInt(np)
	}

	outputRaw := toMap(getVal(data, "output", "Output"))
	if outputRaw != nil {
		extractionsRaw, _ := outputRaw["extractions"].([]interface{})
		extractions := make([]Extraction, 0, len(extractionsRaw))
		for _, eRaw := range extractionsRaw {
			if m, ok := eRaw.(map[string]interface{}); ok {
				extractions = append(extractions, parseExtraction(m))
			}
		}
		resp.Output = &ProcessingOutput{Extractions: extractions}
	}

	return resp
}
