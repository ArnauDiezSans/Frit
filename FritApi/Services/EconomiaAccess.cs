using System.Security.Claims;

namespace FritApi.Services;

public static class EconomiaAccess
{
    public static bool IsAuthorized(ClaimsPrincipal user) => PrimaryManagerAccess.IsAuthorized(user);
}
