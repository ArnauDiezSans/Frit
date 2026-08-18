using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController, Authorize]
[Route("api/juegos/{juegoId:int}/progreso")]
public sealed class JuegoProgresoController(JuegoProgresoService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(int juegoId)
    {
        var result = await service.GetAsync(juegoId);
        return result.Value is null ? BadRequest(new { message = result.Error }) : Ok(result.Value);
    }

    [HttpGet("niveles")]
    public async Task<IActionResult> GetLevels(int juegoId)
    {
        var result = await service.GetLevelsAsync(juegoId);
        return result.Value is null ? BadRequest(new { message = result.Error }) : Ok(result.Value);
    }

    [HttpPost("visitantes")]
    public async Task<IActionResult> AddVisitor(int juegoId, JuegoProgresoNombreDto dto)
    {
        var result = await service.AddVisitorAsync(juegoId, dto.Nombre);
        return result.Value is null ? BadRequest(new { message = result.Error }) : Ok(result.Value);
    }

    [HttpDelete("jugadores/{jugadorId:int}")]
    public async Task<IActionResult> DeleteVisitor(int juegoId, int jugadorId)
    {
        var error = await service.DeleteVisitorAsync(juegoId, jugadorId);
        return error is null ? NoContent() : BadRequest(new { message = error });
    }

    [HttpPost("niveles")]
    public async Task<IActionResult> AddLevel(int juegoId, JuegoProgresoNombreDto dto)
    {
        var result = await service.AddLevelAsync(juegoId, dto.Nombre);
        return result.Value is null ? BadRequest(new { message = result.Error }) : Ok(result.Value);
    }

    [HttpPut("niveles/{nivelId:int}")]
    public async Task<IActionResult> RenameLevel(int juegoId, int nivelId, JuegoProgresoNombreDto dto)
    {
        var result = await service.RenameLevelAsync(juegoId, nivelId, dto.Nombre);
        return result.Value is null ? BadRequest(new { message = result.Error }) : Ok(result.Value);
    }

    [HttpDelete("niveles/{nivelId:int}")]
    public async Task<IActionResult> DeleteLevel(int juegoId, int nivelId)
    {
        var error = await service.DeleteLevelAsync(juegoId, nivelId);
        return error is null ? NoContent() : BadRequest(new { message = error });
    }

    [HttpPut("niveles/orden")]
    public async Task<IActionResult> ReorderLevels(int juegoId, JuegoProgresoOrdenDto dto)
    {
        var error = await service.ReorderLevelsAsync(juegoId, dto.NivelIds);
        return error is null ? NoContent() : BadRequest(new { message = error });
    }

    [HttpPut("marcas")]
    public async Task<IActionResult> SetMark(int juegoId, JuegoProgresoMarcaWriteDto dto)
    {
        var error = await service.SetMarkAsync(juegoId, dto);
        return error is null ? NoContent() : BadRequest(new { message = error });
    }
}
