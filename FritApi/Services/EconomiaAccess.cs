using System.Security.Claims;

namespace FritApi.Services;

public static class EconomiaAccess
{
    public static bool IsAuthorized(ClaimsPrincipal user) =>
        string.Equals(user.FindFirstValue(ClaimTypes.Name)?.Trim(), "Arnau", StringComparison.OrdinalIgnoreCase);
}
