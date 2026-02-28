using DocDigitizer;
using Xunit;

namespace DocDigitizer.Tests;

public class ModelsTests
{
    private const string CamelCaseJson = @"{
        ""stateText"": ""COMPLETED"",
        ""traceId"": ""ABC1234"",
        ""pipeline"": ""MainPipelineWithOCR"",
        ""numberPages"": 2,
        ""output"": {
            ""extractions"": [{
                ""docType"": ""Invoice"",
                ""confidence"": 0.95,
                ""country"": ""PT"",
                ""pages"": [1, 2],
                ""extraction"": { ""DocumentNumber"": ""INV-001"", ""TotalAmount"": 1250.0 },
                ""schema"": ""Invoice_PT.json"",
                ""modelSource"": ""llm""
            }]
        },
        ""timers"": { ""DocIngester"": { ""total"": 2345.67 } },
        ""messages"": [""Document processed successfully""]
    }";

    private const string PascalCaseJson = @"{
        ""StateText"": ""COMPLETED"",
        ""TraceId"": ""ABC1234"",
        ""Pipeline"": ""MainPipelineWithOCR"",
        ""NumberPages"": 2,
        ""Output"": {
            ""extractions"": [{
                ""documentType"": ""Invoice"",
                ""confidence"": 0.95,
                ""countryCode"": ""PT"",
                ""pageRange"": { ""start"": 1, ""end"": 2 },
                ""extraction"": { ""DocumentNumber"": ""INV-001"" }
            }]
        },
        ""Messages"": [""OK""]
    }";

    [Fact]
    public void ParseCamelCase_TopLevelFields()
    {
        var result = ResponseParser.Parse(CamelCaseJson);
        Assert.Equal("COMPLETED", result.State);
        Assert.Equal("ABC1234", result.TraceId);
        Assert.Equal("MainPipelineWithOCR", result.Pipeline);
        Assert.Equal(2, result.NumPages);
        Assert.True(result.IsCompleted);
        Assert.False(result.IsError);
        Assert.NotNull(result.Timers);
        Assert.Single(result.Messages!);
    }

    [Fact]
    public void ParseCamelCase_Extractions()
    {
        var result = ResponseParser.Parse(CamelCaseJson);
        Assert.Single(result.Extractions);
        var ext = result.Extractions[0];
        Assert.Equal("Invoice", ext.DocumentType);
        Assert.Equal(0.95, ext.Confidence);
        Assert.Equal("PT", ext.CountryCode);
        Assert.Equal("Invoice_PT.json", ext.Schema);
        Assert.Equal("llm", ext.ModelSource);
    }

    [Fact]
    public void ParseCamelCase_PageRange()
    {
        var result = ResponseParser.Parse(CamelCaseJson);
        var ext = result.Extractions[0];
        Assert.Equal(new[] { 1, 2 }, ext.Pages);
        Assert.NotNull(ext.PageRange);
        Assert.Equal(1, ext.PageRange!.Start);
        Assert.Equal(2, ext.PageRange!.End);
    }

    [Fact]
    public void ParsePascalCase_TopLevelFields()
    {
        var result = ResponseParser.Parse(PascalCaseJson);
        Assert.Equal("COMPLETED", result.State);
        Assert.Equal("ABC1234", result.TraceId);
        Assert.Equal("MainPipelineWithOCR", result.Pipeline);
    }

    [Fact]
    public void ParsePascalCase_PageRange()
    {
        var result = ResponseParser.Parse(PascalCaseJson);
        var ext = result.Extractions[0];
        Assert.NotNull(ext.PageRange);
        Assert.Equal(1, ext.PageRange!.Start);
        Assert.Equal(2, ext.PageRange!.End);
    }

    [Fact]
    public void ParseEmptyResponse()
    {
        var result = ResponseParser.Parse(@"{""stateText"": ""COMPLETED"", ""traceId"": ""X""}");
        Assert.Equal("COMPLETED", result.State);
        Assert.Null(result.Output);
        Assert.Empty(result.Extractions);
    }

    [Fact]
    public void ParseErrorResponse()
    {
        var json = @"{
            ""stateText"": ""ERROR"",
            ""traceId"": ""ERR9876"",
            ""messages"": [""File must be a PDF document""]
        }";
        var result = ResponseParser.Parse(json);
        Assert.Equal("ERROR", result.State);
        Assert.True(result.IsError);
        Assert.Single(result.Messages!);
        Assert.Equal("File must be a PDF document", result.Messages![0]);
    }

    [Fact]
    public void ParseMultipleExtractions()
    {
        var json = @"{
            ""stateText"": ""COMPLETED"",
            ""traceId"": ""MULTI1"",
            ""output"": {
                ""extractions"": [
                    { ""docType"": ""Invoice"", ""confidence"": 0.9, ""country"": ""PT"", ""pages"": [1, 2], ""extraction"": {} },
                    { ""docType"": ""Receipt"", ""confidence"": 0.85, ""country"": ""ES"", ""pages"": [3], ""extraction"": {} }
                ]
            }
        }";
        var result = ResponseParser.Parse(json);
        Assert.Equal(2, result.Extractions.Count);
        Assert.Equal("Invoice", result.Extractions[0].DocumentType);
        Assert.Equal("Receipt", result.Extractions[1].DocumentType);
        Assert.Equal(3, result.Extractions[1].PageRange!.Start);
        Assert.Equal(3, result.Extractions[1].PageRange!.End);
    }
}
