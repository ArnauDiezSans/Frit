using System.Security.Claims;

namespace FritApi.Services;

public static class PrimaryManagerAccess
{
    public const string ClaimType = "frit:primary-manager";

    public static bool IsAuthorized(ClaimsPrincipal user) =>
        user.HasClaim(ClaimType, "true");
}
