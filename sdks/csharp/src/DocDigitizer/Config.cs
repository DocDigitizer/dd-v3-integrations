namespace DocDigitizer;

/// <summary>
/// Configuration for the DocDigitizer client.
/// </summary>
public class ClientConfig
{
    public const string DefaultBaseUrl = "https://apix.docdigitizer.com/sync";
    public static readonly TimeSpan DefaultTimeout = TimeSpan.FromMinutes(5);
    public const int DefaultMaxRetries = 3;

    /// <summary>API key for authentication.</summary>
    public string ApiKey { get; set; } = "";

    /// <summary>Base URL of the DocDigitizer API.</summary>
    public string BaseUrl { get; set; } = DefaultBaseUrl;

    /// <summary>HTTP request timeout.</summary>
    public TimeSpan Timeout { get; set; } = DefaultTimeout;

    /// <summary>Maximum retries for retryable errors.</summary>
    public int MaxRetries { get; set; } = DefaultMaxRetries;

    /// <summary>
    /// Resolves configuration from explicit values and environment variables.
    /// </summary>
    public static ClientConfig Resolve(string? apiKey = null, string? baseUrl = null, TimeSpan? timeout = null, int? maxRetries = null)
    {
        var key = apiKey
            ?? Environment.GetEnvironmentVariable("DOCDIGITIZER_API_KEY")
            ?? "";

        if (string.IsNullOrEmpty(key))
            throw new InvalidOperationException(
                "API key is required. Pass apiKey or set DOCDIGITIZER_API_KEY.");

        var url = baseUrl
            ?? Environment.GetEnvironmentVariable("DOCDIGITIZER_BASE_URL")
            ?? DefaultBaseUrl;
        url = url.TrimEnd('/');

        var t = timeout ?? DefaultTimeout;
        var envTimeout = Environment.GetEnvironmentVariable("DOCDIGITIZER_TIMEOUT");
        if (timeout == null && !string.IsNullOrEmpty(envTimeout) && int.TryParse(envTimeout, out var ms))
            t = TimeSpan.FromMilliseconds(ms);

        return new ClientConfig
        {
            ApiKey = key,
            BaseUrl = url,
            Timeout = t,
            MaxRetries = maxRetries ?? DefaultMaxRetries,
        };
    }
}
