using DocDigitizer;
using Xunit;

namespace DocDigitizer.Tests;

public class ErrorsTests
{
    [Theory]
    [InlineData(400, typeof(ValidationException))]
    [InlineData(401, typeof(AuthenticationException))]
    [InlineData(429, typeof(RateLimitException))]
    [InlineData(500, typeof(ServerException))]
    [InlineData(503, typeof(ServiceUnavailableException))]
    [InlineData(504, typeof(TimeoutException))]
    public void RaiseForStatus_ReturnsCorrectType(int statusCode, Type expectedType)
    {
        var ex = ErrorMapping.RaiseForStatus(statusCode, "TRACE1", new[] { "error" });
        Assert.IsType(expectedType, ex);
        Assert.Equal(statusCode, ex.StatusCode);
    }

    [Fact]
    public void RaiseForStatus_UnknownCode_ReturnsBase()
    {
        var ex = ErrorMapping.RaiseForStatus(418);
        Assert.IsType<DocDigitizerException>(ex);
        Assert.Equal(418, ex.StatusCode);
    }

    [Fact]
    public void RaiseForStatus_JoinsMessages()
    {
        var ex = ErrorMapping.RaiseForStatus(400, messages: new[] { "err1", "err2" });
        Assert.Equal("err1; err2", ex.Message);
    }

    [Fact]
    public void RaiseForStatus_DefaultMessage()
    {
        var ex = ErrorMapping.RaiseForStatus(500);
        Assert.Equal("HTTP 500", ex.Message);
    }

    [Fact]
    public void AllErrorsExtendBase()
    {
        var errors = new DocDigitizerException[]
        {
            new AuthenticationException("a"),
            new ValidationException("b"),
            new RateLimitException("c"),
            new ServerException("d"),
            new ServiceUnavailableException("e"),
            new TimeoutException("f"),
        };
        foreach (var err in errors)
        {
            Assert.IsAssignableFrom<DocDigitizerException>(err);
            Assert.IsAssignableFrom<Exception>(err);
        }
    }

    [Fact]
    public void ErrorCarriesFields()
    {
        var ex = ErrorMapping.RaiseForStatus(401, "TRACE1", new[] { "bad key" },
            new Dictionary<string, object> { { "total", 1.0 } });
        Assert.Equal("TRACE1", ex.TraceId);
        Assert.Single(ex.Messages!);
        Assert.Equal("bad key", ex.Messages![0]);
    }

    [Fact]
    public void RetryableStatusCodes()
    {
        Assert.Contains(429, ErrorMapping.RetryableStatusCodes);
        Assert.Contains(500, ErrorMapping.RetryableStatusCodes);
        Assert.Contains(503, ErrorMapping.RetryableStatusCodes);
        Assert.Contains(504, ErrorMapping.RetryableStatusCodes);
        Assert.DoesNotContain(400, ErrorMapping.RetryableStatusCodes);
        Assert.DoesNotContain(401, ErrorMapping.RetryableStatusCodes);
    }
}
