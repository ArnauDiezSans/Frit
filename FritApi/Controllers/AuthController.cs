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
    private readonly IConfiguration _configuration;

    public AuthController(
        AppDbContext context,
        PasswordService passwordService,
        IConfiguration configuration)
    {
        _context = context;
        _passwordService = passwordService;
        _configuration = configuration;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthUserDto>> Login([FromBody] LoginRequestDto dto)
    {
        var nombre = dto.Nombre.Trim();

        var usuario = await _context.Usuarios
            .FirstOrDefaultAsync(u => u.Nombre == nombre);

        if (usuario is null)
        {
            return Unauthorized();
        }

        var validPassword = _passwordService.VerifyPassword(usuario.PasswordHash, dto.Password);

        if (!validPassword)
        {
            return Unauthorized();
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, usuario.UsuarioId.ToString()),
            new Claim(ClaimTypes.Name, usuario.Nombre),
            new Claim(ClaimTypes.Role, usuario.EsAdmin ? "Admin" : "User")
        };

        var identity = new ClaimsIdentity(
            claims,
            CookieAuthenticationDefaults.AuthenticationScheme);

        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal);

        return Ok(new AuthUserDto
        {
            UsuarioId = usuario.UsuarioId,
            Nombre = usuario.Nombre,
            EsAdmin = usuario.EsAdmin
        });
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
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var usuario = await _context.Usuarios
            .Where(u => u.UsuarioId == userId)
            .Select(u => new AuthUserDto
            {
                UsuarioId = u.UsuarioId,
                Nombre = u.Nombre,
                EsAdmin = u.EsAdmin
            })
            .FirstOrDefaultAsync();

        if (usuario is null)
        {
            return Unauthorized();
        }

        return Ok(usuario);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthUserDto>> Register([FromBody] UsuarioWriteDto dto)
    {
        var nombre = dto.Nombre.Trim();
        var registrationCode = _configuration["GROUP_REGISTRATION_CODE"];

        if (string.IsNullOrWhiteSpace(registrationCode))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "El registre no està configurat." });
        }

        if (!string.Equals(dto.Grupo?.Trim(), registrationCode, StringComparison.Ordinal))
        {
            return BadRequest(new { message = "Codi de grup incorrecte." });
        }

        var exists = await _context.Usuarios.AnyAsync(u => u.Nombre == nombre);

        if (exists)
        {
            return Conflict(new { message = "Ja existeix un usuari amb aquest nom." });
        }

        var usuario = new Models.Usuario
        {
            Nombre = nombre,
            Grupo = null,
            Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim(),
            PasswordHash = _passwordService.HashPassword(dto.Password)
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return StatusCode(StatusCodes.Status201Created, new AuthUserDto
        {
            UsuarioId = usuario.UsuarioId,
            Nombre = usuario.Nombre,
            EsAdmin = usuario.EsAdmin
        });
    }
}
