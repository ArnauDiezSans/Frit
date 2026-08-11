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
    private readonly PushNotificationService _pushNotificationService;

    public AQueJuguemController(AQueJuguemService aQueJuguemService, PushNotificationService pushNotificationService)
    {
        _aQueJuguemService = aQueJuguemService;
        _pushNotificationService = pushNotificationService;
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

        await _pushNotificationService.SendRemadaAsync(userId, dto.UsuarioIds, dto.PuntsPerJugador, HttpContext.RequestAborted);

        return NoContent();
    }

    [HttpGet("remades")]
    public async Task<ActionResult<List<RemadaDto>>> GetRemades()
    {
        return Ok(await _aQueJuguemService.GetRemadesAsync());
    }

    [HttpPut("remades/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRemada(int id, [FromBody] RemadaUpdateDto dto)
    {
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
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteRemada(int id)
    {
        return await _aQueJuguemService.DeleteRemadaAsync(id)
            ? NoContent()
            : NotFound();
    }

}
