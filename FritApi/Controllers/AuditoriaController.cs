using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/auditoria")]
public class AuditoriaController(AuditService auditService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AuditPageDto>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? usuario = null,
        [FromQuery] string? entidad = null,
        [FromQuery] string? accion = null,
        [FromQuery] DateTime? desde = null,
        [FromQuery] DateTime? hasta = null,
        [FromQuery] string? texto = null)
    {
        if (!TryGetUserId(out var usuarioId) || !await auditService.IsAuthorizedAsync(usuarioId))
        {
            return Forbid();
        }

        return Ok(await auditService.GetAsync(page, pageSize, usuario, entidad, accion, desde, hasta, texto));
    }

    private bool TryGetUserId(out int usuarioId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out usuarioId);
}
