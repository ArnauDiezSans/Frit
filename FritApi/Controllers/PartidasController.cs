using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartidasController : ControllerBase
{
    private readonly PartidaService _partidaService;

    public PartidasController(PartidaService partidaService)
    {
        _partidaService = partidaService;
    }

    [HttpGet]
    public async Task<ActionResult<List<PartidaDto>>> GetAll()
    {
        var partidas = await _partidaService.GetAllAsync();
        return Ok(partidas);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PartidaDto>> GetById(int id)
    {
        var partida = await _partidaService.GetByIdAsync(id);

        if (partida is null)
        {
            return NotFound();
        }

        return Ok(partida);
    }

    [HttpPost]
    public async Task<ActionResult<PartidaDto>> Create([FromBody] PartidaDto dto)
    {
        var result = await _partidaService.CreateAsync(dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Partida!.PartidaId }, result.Partida);
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<ActionResult<PartidaDto>> Update(int id, [FromBody] PartidaDto dto)
    {
        if (!CanEditPartidas(User))
        {
            return Forbid();
        }

        var result = await _partidaService.UpdateAsync(id, dto);

        if (!result.Success)
        {
            if (result.Error == "Partida no trobada.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Partida);
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        if (!CanEditPartidas(User))
        {
            return Forbid();
        }

        var deleted = await _partidaService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    private static bool CanEditPartidas(ClaimsPrincipal user)
    {
        var name = user.FindFirstValue(ClaimTypes.Name);
        return string.Equals(name, "Arnau", StringComparison.OrdinalIgnoreCase);
    }
}
