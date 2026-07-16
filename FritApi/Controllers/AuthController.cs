using System.Security.Claims;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PasswordService _passwordService;

    public AuthController(AppDbContext context, PasswordService passwordService)
    {
        _context = context;
        _passwordService = passwordService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthUserDto>> Login([FromBody] LoginRequestDto dto)
    {
        var nombre = dto.Nombre.Trim();

        var usuario = await _context.Usuarios
            .IgnoreQueryFilters()
            .Include(item => item.Tenant)
            .FirstOrDefaultAsync(item =>
                item.Nombre == nombre &&
                item.Tenant.Actiu);

        if (usuario is null || !_passwordService.VerifyPassword(usuario.PasswordHash, dto.Password))
        {
            return Unauthorized();
        }

        await SignInAsync(usuario);
        return Ok(ToAuthUser(usuario));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<AuthUserDto>> Me()
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            return Unauthorized();
        }

        var usuario = await _context.Usuarios
            .Include(item => item.Tenant)
            .FirstOrDefaultAsync(item => item.UsuarioId == userId);

        return usuario is null ? Unauthorized() : Ok(ToAuthUser(usuario));
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthUserDto>> Register([FromBody] RegisterRequestDto dto)
    {
        var nombre = dto.Nombre.Trim();
        var tenantCodi = NormalizeTenantCode(dto.TenantCodi);
        var tenant = await _context.Tenants
            .FirstOrDefaultAsync(item => item.Codi == tenantCodi && item.Actiu);

        if (tenant is null)
        {
            return BadRequest(new { message = "El grup no existeix o no està actiu." });
        }

        var exists = await _context.Usuarios
            .IgnoreQueryFilters()
            .AnyAsync(item => item.Nombre == nombre);

        if (exists)
        {
            return Conflict(new { message = "Ja existeix un usuari amb aquest nom." });
        }

        var usuario = new Models.Usuario
        {
            TenantId = tenant.TenantId,
            Nombre = nombre,
            PasswordHash = _passwordService.HashPassword(dto.Password),
            Tenant = tenant
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, ToAuthUser(usuario));
    }

    private async Task SignInAsync(Models.Usuario usuario)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.UsuarioId.ToString()),
            new(TenantClaims.TenantId, usuario.TenantId.ToString()),
            new(ClaimTypes.Name, usuario.Nombre),
            new(ClaimTypes.Role, usuario.EsAdmin ? "Admin" : "User")
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity));
    }

    private static AuthUserDto ToAuthUser(Models.Usuario usuario) => new()
    {
        UsuarioId = usuario.UsuarioId,
        Nombre = usuario.Nombre,
        EsAdmin = usuario.EsAdmin,
        TenantId = usuario.TenantId,
        TenantCodi = usuario.Tenant.Codi,
        TenantNom = usuario.Tenant.Nom
    };

    private static string NormalizeTenantCode(string value) => value.Trim().ToLowerInvariant();
}
