using System.Text.Json;

namespace DocDigitizer;

/// <summary>
/// Options for document processing.
/// </summary>
public class ProcessOptions
{
    /// <summary>Path to a PDF file on disk.</summary>
    public string? FilePath { get; set; }
    /// <summary>PDF file as a byte array.</summary>
    public byte[]? FileContent { get; set; }
    /// <summary>Override the file name sent to the API.</summary>
    public string? FileName { get; set; }
    /// <summary>Document UUID (auto-generated if null).</summary>
    public string? Id { get; set; }
    /// <summary>Context UUID for grouping documents (auto-generated if null).</summary>
    public string? ContextId { get; set; }
    /// <summary>Pipeline name to use for processing.</summary>
    public string? PipelineIdentifier { get; set; }
    /// <summary>Trace token for distributed tracing.</summary>
    public string? RequestToken { get; set; }
}

/// <summary>
/// DocDigitizer API client for processing PDF documents.
/// </summary>
public class DocDigitizerClient : IDisposable
{
    private readonly ClientConfig _config;
    private readonly HttpClient _http;

    public DocDigitizerClient(string apiKey, string? baseUrl = null, TimeSpan? timeout = null, int? maxRetries = null)
    {
        _config = ClientConfig.Resolve(apiKey, baseUrl, timeout, maxRetries);
        _http = new HttpClient { Timeout = _config.Timeout };
    }

    public DocDigitizerClient(ClientConfig config)
    {
        _config = config;
        _http = new HttpClient { Timeout = _config.Timeout };
    }

    /// <summary>Check if the API is healthy and responsive.</summary>
    public async Task<string> HealthCheckAsync(CancellationToken cancellationToken = default)
    {
        var response = await _http.GetAsync($"{_config.BaseUrl}/", cancellationToken);

        if ((int)response.StatusCode >= 400)
            throw ErrorMapping.RaiseForStatus((int)response.StatusCode);

        return await response.Content.ReadAsStringAsync(cancellationToken);
    }

    /// <summary>Process a PDF document and extract structured data.</summary>
    public async Task<ProcessingResponse> ProcessAsync(string filePath, CancellationToken cancellationToken = default)
    {
        return await ProcessAsync(new ProcessOptions { FilePath = filePath }, cancellationToken);
    }

    /// <summary>Process a PDF document and extract structured data.</summary>
    public async Task<ProcessingResponse> ProcessAsync(ProcessOptions options, CancellationToken cancellationToken = default)
    {
        byte[] fileContent;
        string fileName;

        if (options.FilePath != null)
        {
            fileContent = await File.ReadAllBytesAsync(options.FilePath, cancellationToken);
            fileName = options.FileName ?? Path.GetFileName(options.FilePath);
        }
        else if (options.FileContent != null)
        {
            fileContent = options.FileContent;
            fileName = options.FileName ?? "document.pdf";
        }
        else
        {
            throw new ArgumentException("Either FilePath or FileContent is required.");
        }

        var id = options.Id ?? Guid.NewGuid().ToString();
        var contextId = options.ContextId ?? Guid.NewGuid().ToString();

        return await ExecuteWithRetryAsync(fileContent, fileName, id, contextId,
            options.PipelineIdentifier, options.RequestToken, cancellationToken);
    }

    private async Task<ProcessingResponse> ExecuteWithRetryAsync(
        byte[] fileContent, string fileName, string id, string contextId,
        string? pipeline, string? requestToken, CancellationToken cancellationToken)
    {
        Exception? lastError = null;

        for (var attempt = 0; attempt <= _config.MaxRetries; attempt++)
        {
            if (attempt > 0)
            {
                var delay = Math.Min(1000 * (int)Math.Pow(2, attempt - 1), 30_000);
                await Task.Delay(delay, cancellationToken);
            }

            using var form = new MultipartFormDataContent();
            var fileStream = new ByteArrayContent(fileContent);
            fileStream.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
            form.Add(fileStream, "files", fileName);
            form.Add(new StringContent(id), "id");
            form.Add(new StringContent(contextId), "contextID");

            if (pipeline != null)
                form.Add(new StringContent(pipeline), "pipelineIdentifier");
            if (requestToken != null)
                form.Add(new StringContent(requestToken), "requestToken");

            using var request = new HttpRequestMessage(HttpMethod.Post, $"{_config.BaseUrl}/");
            request.Headers.Add("X-API-Key", _config.ApiKey);
            request.Content = form;

            var response = await _http.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadAsStringAsync(cancellationToken);

            var statusCode = (int)response.StatusCode;
            if (statusCode >= 400)
            {
                string? traceId = null;
                IReadOnlyList<string>? messages = null;
                IDictionary<string, object>? timers = null;

                try
                {
                    var doc = JsonDocument.Parse(body);
                    var root = doc.RootElement;
                    traceId = TryGetString(root, "traceId") ?? TryGetString(root, "TraceId");
                    messages = TryGetStringArray(root, "messages") ?? TryGetStringArray(root, "Messages");
                }
                catch { /* non-JSON response */ }

                if (ErrorMapping.RetryableStatusCodes.Contains(statusCode) && attempt < _config.MaxRetries)
                {
                    lastError = ErrorMapping.RaiseForStatus(statusCode, traceId, messages, timers);
                    continue;
                }

                throw ErrorMapping.RaiseForStatus(statusCode, traceId, messages, timers);
            }

            return ResponseParser.Parse(body);
        }

        throw lastError ?? new DocDigitizerException("Request failed after retries");
    }

    private static string? TryGetString(JsonElement el, string name)
    {
        return el.TryGetProperty(name, out var val) && val.ValueKind == JsonValueKind.String
            ? val.GetString() : null;
    }

    private static IReadOnlyList<string>? TryGetStringArray(JsonElement el, string name)
    {
        if (!el.TryGetProperty(name, out var val) || val.ValueKind != JsonValueKind.Array)
            return null;
        return val.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString()!)
            .ToList();
    }

    public void Dispose()
    {
        _http.Dispose();
        GC.SuppressFinalize(this);
    }
}
