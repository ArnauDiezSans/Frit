using System.Security.Claims;
using FritApi.Services;

namespace FritApi.Tests;

public class EconomiaAccessTests
{
    [Fact]
    public void AuthorizesArnauIgnoringCaseAndWhitespace()
    {
        var user = Principal("  arnau ");
        Assert.True(EconomiaAccess.IsAuthorized(user));
    }

    [Fact]
    public void RejectsOtherAuthenticatedUsers()
    {
        Assert.False(EconomiaAccess.IsAuthorized(Principal("Anna")));
    }

    private static ClaimsPrincipal Principal(string name) =>
        new(new ClaimsIdentity([new Claim(ClaimTypes.Name, name)], "test"));
}
