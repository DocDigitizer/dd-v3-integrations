using Xunit;
using YamlDotNet.Serialization;

namespace DocDigitizer.Tests;

public class ContractTests
{
    private static readonly string RepoRoot = Path.GetFullPath(
        Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".."));
    private static readonly string SpecPath = Path.Combine(RepoRoot, "openapi", "sync.openapi.yaml");
    private static readonly string ManifestPath = Path.Combine(
        RepoRoot, "sdks", "csharp", "sdk-manifest.yaml");

    private static Dictionary<string, object> LoadYaml(string path)
    {
        var deserializer = new DeserializerBuilder().Build();
        return deserializer.Deserialize<Dictionary<string, object>>(File.ReadAllText(path));
    }

    [Fact]
    public void ManifestOperationsExistInSpec()
    {
        if (!File.Exists(SpecPath)) return;
        var spec = LoadYaml(SpecPath);
        var manifest = LoadYaml(ManifestPath);

        var specOps = new HashSet<string>();
        if (spec.TryGetValue("paths", out var pathsObj) && pathsObj is Dictionary<object, object> paths)
        {
            foreach (var methods in paths.Values)
            {
                if (methods is Dictionary<object, object> methodMap)
                {
                    foreach (var op in methodMap.Values)
                    {
                        if (op is Dictionary<object, object> opDict && opDict.TryGetValue("operationId", out var id))
                            specOps.Add(id.ToString()!);
                    }
                }
            }
        }

        if (manifest.TryGetValue("operations", out var opsObj) && opsObj is List<object> ops)
        {
            foreach (var op in ops)
            {
                if (op is Dictionary<object, object> opDict && opDict.TryGetValue("operationId", out var id))
                    Assert.Contains(id.ToString()!, specOps);
            }
        }
    }

    [Fact]
    public void ApiVersionMatches()
    {
        if (!File.Exists(SpecPath)) return;
        var spec = LoadYaml(SpecPath);
        var manifest = LoadYaml(ManifestPath);

        var specInfo = (Dictionary<object, object>)spec["info"];
        var sdkInfo = (Dictionary<object, object>)manifest["sdk"];
        Assert.Equal(specInfo["version"].ToString(), sdkInfo["api_version"].ToString());
    }

    [Fact]
    public void ProcessingResponseSchemaHasRequiredFields()
    {
        if (!File.Exists(SpecPath)) return;
        var spec = LoadYaml(SpecPath);

        var components = (Dictionary<object, object>)spec["components"];
        var schemas = (Dictionary<object, object>)components["schemas"];
        var responseSchema = (Dictionary<object, object>)schemas["ProcessingResponse"];
        var required = (List<object>)responseSchema["required"];

        Assert.Contains("StateText", required.Select(r => r.ToString()));
        Assert.Contains("TraceId", required.Select(r => r.ToString()));
    }

    [Fact]
    public void ExtractionSchemaHasExpectedProperties()
    {
        if (!File.Exists(SpecPath)) return;
        var spec = LoadYaml(SpecPath);

        var components = (Dictionary<object, object>)spec["components"];
        var schemas = (Dictionary<object, object>)components["schemas"];
        var extractionSchema = (Dictionary<object, object>)schemas["Extraction"];
        var properties = (Dictionary<object, object>)extractionSchema["properties"];

        Assert.True(properties.ContainsKey("documentType"));
        Assert.True(properties.ContainsKey("confidence"));
        Assert.True(properties.ContainsKey("countryCode"));
        Assert.True(properties.ContainsKey("pageRange"));
        Assert.True(properties.ContainsKey("extraction"));
    }
}
