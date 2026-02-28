using System.Text.Json;

namespace DocDigitizer;

public record PageRange(int Start, int End);

public record Extraction(
    string DocumentType,
    double Confidence,
    string CountryCode,
    IReadOnlyList<int> Pages,
    PageRange? PageRange,
    IDictionary<string, object> ExtractionData,
    string? Schema = null,
    string? ModelSource = null
);

public record ProcessingOutput(IReadOnlyList<Extraction> Extractions);

public record ProcessingResponse(
    string State,
    string TraceId,
    string? Pipeline,
    int? NumPages,
    ProcessingOutput? Output,
    IDictionary<string, object>? Timers,
    IReadOnlyList<string>? Messages
)
{
    public bool IsCompleted => State == "COMPLETED";
    public bool IsError => State == "ERROR";
    public IReadOnlyList<Extraction> Extractions => Output?.Extractions ?? Array.Empty<Extraction>();
}

public static class ResponseParser
{
    /// <summary>
    /// Dual-case getter: tries camelCase first, then PascalCase fallback.
    /// </summary>
    private static JsonElement? Get(JsonElement obj, string camel, string pascal)
    {
        if (obj.TryGetProperty(camel, out var val)) return val;
        if (obj.TryGetProperty(pascal, out val)) return val;
        return null;
    }

    private static string GetString(JsonElement obj, string camel, string pascal, string fallback = "")
    {
        var el = Get(obj, camel, pascal);
        return el?.ValueKind == JsonValueKind.String ? el.Value.GetString()! : fallback;
    }

    private static int? GetInt(JsonElement obj, string camel, string pascal)
    {
        var el = Get(obj, camel, pascal);
        if (el == null || el.Value.ValueKind != JsonValueKind.Number) return null;
        return el.Value.GetInt32();
    }

    private static IDictionary<string, object>? GetDict(JsonElement obj, string camel, string pascal)
    {
        var el = Get(obj, camel, pascal);
        if (el == null || el.Value.ValueKind != JsonValueKind.Object) return null;
        return JsonElementToDict(el.Value);
    }

    private static IReadOnlyList<string>? GetStringArray(JsonElement obj, string camel, string pascal)
    {
        var el = Get(obj, camel, pascal);
        if (el == null || el.Value.ValueKind != JsonValueKind.Array) return null;
        return el.Value.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString()!)
            .ToList();
    }

    private static IDictionary<string, object> JsonElementToDict(JsonElement el)
    {
        var dict = new Dictionary<string, object>();
        foreach (var prop in el.EnumerateObject())
        {
            dict[prop.Name] = JsonElementToObject(prop.Value);
        }
        return dict;
    }

    private static object JsonElementToObject(JsonElement el)
    {
        return el.ValueKind switch
        {
            JsonValueKind.String => el.GetString()!,
            JsonValueKind.Number => el.TryGetInt64(out var l) ? l : el.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Array => el.EnumerateArray().Select(JsonElementToObject).ToList(),
            JsonValueKind.Object => JsonElementToDict(el),
            _ => (object)null!,
        };
    }

    private static Extraction ParseExtraction(JsonElement raw)
    {
        var pages = new List<int>();
        if (raw.TryGetProperty("pages", out var pagesEl) && pagesEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var p in pagesEl.EnumerateArray())
            {
                if (p.ValueKind == JsonValueKind.Number) pages.Add(p.GetInt32());
            }
        }

        PageRange? pageRange = null;
        if (raw.TryGetProperty("pageRange", out var prEl) && prEl.ValueKind == JsonValueKind.Object)
        {
            var start = prEl.TryGetProperty("start", out var s) ? s.GetInt32() : 0;
            var end = prEl.TryGetProperty("end", out var e) ? e.GetInt32() : 0;
            pageRange = new PageRange(start, end);
        }
        else if (pages.Count > 0)
        {
            pageRange = new PageRange(pages.Min(), pages.Max());
        }

        var docType = GetString(raw, "docType", "documentType");
        var confidence = raw.TryGetProperty("confidence", out var confEl) && confEl.ValueKind == JsonValueKind.Number
            ? confEl.GetDouble() : 0;
        var countryCode = GetString(raw, "country", "countryCode");
        var extraction = raw.TryGetProperty("extraction", out var extEl) && extEl.ValueKind == JsonValueKind.Object
            ? JsonElementToDict(extEl) : new Dictionary<string, object>();
        var schema = raw.TryGetProperty("schema", out var schEl) && schEl.ValueKind == JsonValueKind.String
            ? schEl.GetString() : null;
        var modelSource = raw.TryGetProperty("modelSource", out var msEl) && msEl.ValueKind == JsonValueKind.String
            ? msEl.GetString() : null;

        return new Extraction(docType, confidence, countryCode, pages, pageRange, extraction, schema, modelSource);
    }

    public static ProcessingResponse Parse(JsonElement data)
    {
        var state = GetString(data, "stateText", "StateText");
        var traceId = GetString(data, "traceId", "TraceId");
        var pipeline = Get(data, "pipeline", "Pipeline")?.ValueKind == JsonValueKind.String
            ? Get(data, "pipeline", "Pipeline")!.Value.GetString() : null;
        var numPages = GetInt(data, "numberPages", "NumberPages");
        var timers = GetDict(data, "timers", "Timers");
        var messages = GetStringArray(data, "messages", "Messages");

        ProcessingOutput? output = null;
        var outputEl = Get(data, "output", "Output");
        if (outputEl != null && outputEl.Value.ValueKind == JsonValueKind.Object)
        {
            var extractions = new List<Extraction>();
            if (outputEl.Value.TryGetProperty("extractions", out var extArr) && extArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var extEl in extArr.EnumerateArray())
                {
                    if (extEl.ValueKind == JsonValueKind.Object)
                        extractions.Add(ParseExtraction(extEl));
                }
            }
            output = new ProcessingOutput(extractions);
        }

        return new ProcessingResponse(state, traceId, pipeline, numPages, output, timers, messages);
    }

    public static ProcessingResponse Parse(string json)
    {
        var doc = JsonDocument.Parse(json);
        return Parse(doc.RootElement);
    }
}
