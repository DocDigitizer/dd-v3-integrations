namespace DocDigitizer;

/// <summary>Base exception for all DocDigitizer SDK errors.</summary>
public class DocDigitizerException : Exception
{
    public int? StatusCode { get; }
    public string? TraceId { get; }
    public IReadOnlyList<string>? Messages { get; }
    public IDictionary<string, object>? Timers { get; }

    public DocDigitizerException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message)
    {
        StatusCode = statusCode;
        TraceId = traceId;
        Messages = messages;
        Timers = timers;
    }
}

/// <summary>HTTP 401 — Invalid or missing API key.</summary>
public class AuthenticationException : DocDigitizerException
{
    public AuthenticationException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message, statusCode, traceId, messages, timers) { }
}

/// <summary>HTTP 400 — Invalid request.</summary>
public class ValidationException : DocDigitizerException
{
    public ValidationException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message, statusCode, traceId, messages, timers) { }
}

/// <summary>HTTP 429 — Rate limit exceeded.</summary>
public class RateLimitException : DocDigitizerException
{
    public RateLimitException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message, statusCode, traceId, messages, timers) { }
}

/// <summary>HTTP 500 — Internal server error.</summary>
public class ServerException : DocDigitizerException
{
    public ServerException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message, statusCode, traceId, messages, timers) { }
}

/// <summary>HTTP 503 — Downstream service unavailable.</summary>
public class ServiceUnavailableException : DocDigitizerException
{
    public ServiceUnavailableException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message, statusCode, traceId, messages, timers) { }
}

/// <summary>HTTP 504 — Processing timeout.</summary>
public class TimeoutException : DocDigitizerException
{
    public TimeoutException(string message, int? statusCode = null, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
        : base(message, statusCode, traceId, messages, timers) { }
}

public static class ErrorMapping
{
    private static readonly Dictionary<int, Func<string, int?, string?, IReadOnlyList<string>?, IDictionary<string, object>?, DocDigitizerException>> Map = new()
    {
        { 400, (m, s, t, msgs, tmrs) => new ValidationException(m, s, t, msgs, tmrs) },
        { 401, (m, s, t, msgs, tmrs) => new AuthenticationException(m, s, t, msgs, tmrs) },
        { 429, (m, s, t, msgs, tmrs) => new RateLimitException(m, s, t, msgs, tmrs) },
        { 500, (m, s, t, msgs, tmrs) => new ServerException(m, s, t, msgs, tmrs) },
        { 503, (m, s, t, msgs, tmrs) => new ServiceUnavailableException(m, s, t, msgs, tmrs) },
        { 504, (m, s, t, msgs, tmrs) => new TimeoutException(m, s, t, msgs, tmrs) },
    };

    internal static readonly HashSet<int> RetryableStatusCodes = new() { 429, 500, 503, 504 };

    public static DocDigitizerException RaiseForStatus(int statusCode, string? traceId = null, IReadOnlyList<string>? messages = null, IDictionary<string, object>? timers = null)
    {
        var msg = messages != null && messages.Count > 0
            ? string.Join("; ", messages)
            : $"HTTP {statusCode}";

        if (Map.TryGetValue(statusCode, out var factory))
            return factory(msg, statusCode, traceId, messages, timers);

        return new DocDigitizerException(msg, statusCode, traceId, messages, timers);
    }
}
