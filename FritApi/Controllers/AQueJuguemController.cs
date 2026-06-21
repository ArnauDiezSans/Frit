using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/a-que-juguem")]
public class AQueJuguemController : ControllerBase
{
    private readonly AQueJuguemService _aQueJuguemService;

    public AQueJuguemController(AQueJuguemService aQueJuguemService)
    {
        _aQueJuguemService = aQueJuguemService;
    }

    [HttpPost("recommendations")]
    public async Task<ActionResult<List<AQueJuguemRecommendationDto>>> GetRecommendations(
        [FromBody] AQueJuguemRequestDto dto)
    {
        var result = await _aQueJuguemService.GetRecommendationsAsync(dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Juegos);
    }

    [HttpPost("remades")]
    public async Task<IActionResult> RegisterRemada([FromBody] RemadaCreateDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _aQueJuguemService.RegisterRemadaAsync(userId, dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return NoContent();
    }

    [HttpGet("remades")]
    public async Task<ActionResult<List<RemadaDto>>> GetRemades()
    {
        if (!CanManageRemades())
        {
            return Forbid();
        }

        return Ok(await _aQueJuguemService.GetRemadesAsync());
    }

    [HttpPut("remades/{id:int}")]
    public async Task<IActionResult> UpdateRemada(int id, [FromBody] RemadaUpdateDto dto)
    {
        if (!CanManageRemades())
        {
            return Forbid();
        }

        var result = await _aQueJuguemService.UpdateRemadaAsync(id, dto);
        if (!result.Success)
        {
            return result.Error == "Remada no trobada."
                ? NotFound()
                : BadRequest(new { message = result.Error });
        }

        return NoContent();
    }

    [HttpDelete("remades/{id:int}")]
    public async Task<IActionResult> DeleteRemada(int id)
    {
        if (!CanManageRemades())
        {
            return Forbid();
        }

        return await _aQueJuguemService.DeleteRemadaAsync(id)
            ? NoContent()
            : NotFound();
    }

    private bool CanManageRemades()
    {
        return string.Equals(User.FindFirstValue(ClaimTypes.Name), "Arnau", StringComparison.Ordinal);
    }
}
