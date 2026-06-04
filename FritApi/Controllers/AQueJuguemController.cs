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
}
