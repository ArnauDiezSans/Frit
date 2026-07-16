using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PasswordService _passwordService;

    public TenantsController(AppDbContext context, PasswordService passwordService)
    {
        _context = context;
        _passwordService = passwordService;
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<TenantDto>> Create([FromBody] TenantCreateDto dto)
    {
        var codi = dto.Codi.Trim().ToLowerInvariant();
        var nom = dto.Nom.Trim();
        var adminNombre = dto.AdminNombre.Trim();

        if (codi.Length == 0 || nom.Length == 0 || adminNombre.Length == 0)
        {
            return BadRequest(new { message = "El codi, el nom i l'administrador són obligatoris." });
        }

        if (!codi.All(character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_'))
        {
            return BadRequest(new { message = "El codi del grup només pot contenir lletres, números, guions i guions baixos." });
        }

        if (await _context.Tenants.AnyAsync(item => item.Codi == codi))
        {
            return Conflict(new { message = "Ja existeix un grup amb aquest codi." });
        }

        if (await _context.Usuarios.IgnoreQueryFilters().AnyAsync(item => item.Nombre == adminNombre))
        {
            return Conflict(new { message = "Ja existeix un usuari amb aquest nom." });
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();
        var tenant = new Tenant { Codi = codi, Nom = nom };
        _context.Tenants.Add(tenant);
        await _context.SaveChangesAsync();

        // The request belongs to the creator's tenant, so this intentional provisioning
        // operation must bypass the normal tenant write guard.
        var passwordHash = _passwordService.HashPassword(dto.AdminPassword);
        await _context.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO "Usuarios" ("TenantId", "Nombre", "PasswordHash", "EsAdmin", "EsUsuarioExterno", "CreatedAt")
            VALUES ({tenant.TenantId}, {adminNombre}, {passwordHash}, TRUE, FALSE, NOW())
            """);

        var adminId = await _context.Usuarios.IgnoreQueryFilters()
            .Where(item => item.TenantId == tenant.TenantId && item.Nombre == adminNombre)
            .Select(item => item.UsuarioId)
            .SingleAsync();
        await transaction.CommitAsync();

        return StatusCode(StatusCodes.Status201Created, new TenantDto
        {
            TenantId = tenant.TenantId,
            Codi = tenant.Codi,
            Nom = tenant.Nom,
            AdminUsuarioId = adminId,
            AdminNombre = adminNombre
        });
    }
}
