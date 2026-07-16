using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/hall-of-fame")]
public class HallOfFameController : ControllerBase
{
    private readonly HallOfFameService _hallOfFameService;

    public HallOfFameController(HallOfFameService hallOfFameService)
    {
        _hallOfFameService = hallOfFameService;
    }

    [HttpGet]
    public async Task<ActionResult<HallOfFameDto>> Get()
    {
        return Ok(await _hallOfFameService.GetHallOfFameAsync(User.IsInRole("Admin")));
    }

    [HttpGet("usuarios/{usuarioId:int}")]
    public async Task<ActionResult<UserMedalsDto>> GetUserMedals(int usuarioId)
    {
        var result = await _hallOfFameService.GetUserMedalsAsync(usuarioId);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("manual-medallas")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateManualMedal([FromBody] ManualMedallaCreateDto dto)
    {
        var result = await _hallOfFameService.CreateManualMedalAsync(dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return NoContent();
    }

}
