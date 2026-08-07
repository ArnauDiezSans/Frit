using System.Security.Claims;

namespace FritApi.Services;

public sealed class HttpCurrentTenant(IHttpContextAccessor httpContextAccessor) : ICurrentTenant
{
    public int? TenantId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue(TenantClaims.TenantId);
            return int.TryParse(value, out var tenantId) && tenantId > 0 ? tenantId : null;
        }
    }
}
