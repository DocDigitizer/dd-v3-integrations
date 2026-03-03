package docdigitizer

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func newUUID() string {
	var uuid [16]byte
	_, _ = rand.Read(uuid[:])
	uuid[6] = (uuid[6] & 0x0f) | 0x40 // version 4
	uuid[8] = (uuid[8] & 0x3f) | 0x80 // variant
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		uuid[0:4], uuid[4:6], uuid[6:8], uuid[8:10], uuid[10:16])
}

// Client is the DocDigitizer API client.
type Client struct {
	config     *Config
	httpClient *http.Client
}

// New creates a new DocDigitizer client with the given API key and options.
func New(apiKey string, opts ...Option) (*Client, error) {
	cfg, err := resolveConfig(apiKey, opts)
	if err != nil {
		return nil, err
	}
	return &Client{
		config: cfg,
		httpClient: &http.Client{
			Timeout: cfg.Timeout,
		},
	}, nil
}

// ProcessOptions holds options for the Process method.
type ProcessOptions struct {
	// FilePath is the path to a PDF file on disk.
	FilePath string
	// FileContent is the PDF file as bytes.
	FileContent []byte
	// FileName overrides the file name sent to the API.
	FileName string
	// ID is the document UUID (auto-generated if empty).
	ID string
	// ContextID is the context UUID for grouping documents (auto-generated if empty).
	ContextID string
	// PipelineIdentifier is the pipeline name to use.
	PipelineIdentifier string
	// RequestToken is a trace token for distributed tracing.
	RequestToken string
}

// HealthCheck checks if the API is healthy and responsive.
func (c *Client) HealthCheck(ctx context.Context) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.config.BaseURL+"/", nil)
	if err != nil {
		return "", fmt.Errorf("docdigitizer: failed to create request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("docdigitizer: request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("docdigitizer: failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", RaiseForStatus(resp.StatusCode, "", nil, nil)
	}

	return string(body), nil
}

// Process processes a PDF document and returns structured extraction data.
func (c *Client) Process(ctx context.Context, opts ProcessOptions) (*ProcessingResponse, error) {
	var fileContent []byte
	var fileName string

	if opts.FilePath != "" {
		data, err := os.ReadFile(opts.FilePath)
		if err != nil {
			return nil, fmt.Errorf("docdigitizer: failed to read file: %w", err)
		}
		fileContent = data
		fileName = filepath.Base(opts.FilePath)
		if opts.FileName != "" {
			fileName = opts.FileName
		}
	} else if opts.FileContent != nil {
		fileContent = opts.FileContent
		fileName = "document.pdf"
		if opts.FileName != "" {
			fileName = opts.FileName
		}
	} else {
		return nil, fmt.Errorf("docdigitizer: either FilePath or FileContent is required")
	}

	docID := opts.ID
	if docID == "" {
		docID = newUUID()
	}
	contextID := opts.ContextID
	if contextID == "" {
		contextID = newUUID()
	}

	return c.executeWithRetry(ctx, fileContent, fileName, docID, contextID, opts.PipelineIdentifier, opts.RequestToken)
}

// ProcessFile is a convenience method that processes a file from a path.
func (c *Client) ProcessFile(ctx context.Context, filePath string) (*ProcessingResponse, error) {
	return c.Process(ctx, ProcessOptions{FilePath: filePath})
}

func (c *Client) executeWithRetry(
	ctx context.Context,
	fileContent []byte, fileName, docID, contextID, pipeline, requestToken string,
) (*ProcessingResponse, error) {
	var lastErr error

	for attempt := 0; attempt <= c.config.MaxRetries; attempt++ {
		if attempt > 0 {
			delay := time.Duration(math.Min(float64(time.Second)*math.Pow(2, float64(attempt-1)), float64(30*time.Second)))
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
		}

		result, statusCode, err := c.doRequest(ctx, fileContent, fileName, docID, contextID, pipeline, requestToken)
		if err != nil {
			return nil, err
		}

		if statusCode >= 400 {
			if IsRetryable(statusCode) && attempt < c.config.MaxRetries {
				lastErr = RaiseForStatus(statusCode,
					getStr(result, "traceId", "TraceId", ""),
					toStringSlice(getVal(result, "messages", "Messages")),
					toMap(getVal(result, "timers", "Timers")),
				)
				continue
			}
			return nil, RaiseForStatus(statusCode,
				getStr(result, "traceId", "TraceId", ""),
				toStringSlice(getVal(result, "messages", "Messages")),
				toMap(getVal(result, "timers", "Timers")),
			)
		}

		return ParseResponse(result), nil
	}

	return nil, lastErr
}

func (c *Client) doRequest(
	ctx context.Context,
	fileContent []byte, fileName, docID, contextID, pipeline, requestToken string,
) (map[string]interface{}, int, error) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("files", fileName)
	if err != nil {
		return nil, 0, fmt.Errorf("docdigitizer: failed to create form file: %w", err)
	}
	if _, err := part.Write(fileContent); err != nil {
		return nil, 0, fmt.Errorf("docdigitizer: failed to write file: %w", err)
	}

	_ = writer.WriteField("id", docID)
	_ = writer.WriteField("contextID", contextID)
	if pipeline != "" {
		_ = writer.WriteField("pipelineIdentifier", pipeline)
	}
	if requestToken != "" {
		_ = writer.WriteField("requestToken", requestToken)
	}
	writer.Close()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.config.BaseURL+"/extract", &body)
	if err != nil {
		return nil, 0, fmt.Errorf("docdigitizer: failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("X-API-Key", c.config.APIKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("docdigitizer: request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("docdigitizer: failed to read response: %w", err)
	}

	var result map[string]interface{}
	if len(respBody) > 0 {
		if err := json.Unmarshal(respBody, &result); err != nil {
			// Non-JSON response
			result = map[string]interface{}{}
		}
	}

	return result, resp.StatusCode, nil
}
