using System.Security.Claims;
using FritApi.Services;

namespace FritApi.Tests;

public class EconomiaAccessTests
{
    [Fact]
    public void AuthorizesThePrimaryManagerClaim()
    {
        var user = Principal("Arnau", primaryManager: true);
        Assert.True(EconomiaAccess.IsAuthorized(user));
    }

    [Fact]
    public void RejectsAUserNamedArnauWithoutThePrimaryManagerClaim()
    {
        Assert.False(EconomiaAccess.IsAuthorized(Principal("Arnau")));
    }

    private static ClaimsPrincipal Principal(string name, bool primaryManager = false) =>
        new(new ClaimsIdentity([
            new Claim(ClaimTypes.Name, name),
            new Claim(PrimaryManagerAccess.ClaimType, primaryManager ? "true" : "false")
        ], "test"));
}
