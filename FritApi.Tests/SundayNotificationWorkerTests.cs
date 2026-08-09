using FritApi.Services;
using Xunit;

namespace FritApi.Tests;

public class SundayNotificationWorkerTests
{
    [Theory]
    [InlineData("2026-08-08T10:00:00Z", "2026-08-09T06:00:00Z")]
    [InlineData("2026-08-09T05:00:00Z", "2026-08-09T06:00:00Z")]
    [InlineData("2026-08-09T07:00:00Z", "2026-08-16T06:00:00Z")]
    [InlineData("2026-01-03T10:00:00Z", "2026-01-04T07:00:00Z")]
    public void GetNextRunUtc_UsesSundayAtEightInMadrid(string now, string expected)
    {
        var result = SundayNotificationWorker.GetNextRunUtc(DateTimeOffset.Parse(now));

        Assert.Equal(DateTimeOffset.Parse(expected), result);
    }
}
