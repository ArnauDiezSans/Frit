using System.Security.Claims;

namespace FritApi.Services;

public sealed class HttpAuditContext(IHttpContextAccessor httpContextAccessor) : IAuditContext
{
    private HttpContext? HttpContext => httpContextAccessor.HttpContext;

    public int? UsuarioId => int.TryParse(
        HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public string? UsuarioNombre => HttpContext?.User.FindFirstValue(ClaimTypes.Name);

    public string? Ip => HttpContext?.Connection.RemoteIpAddress?.ToString();
}
