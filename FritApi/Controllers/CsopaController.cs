using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/csopa")]
public class CsopaController : ControllerBase
{
    private readonly CsopaService _csopaService;

    public CsopaController(CsopaService csopaService)
    {
        _csopaService = csopaService;
    }

    [HttpGet]
    public async Task<ActionResult<List<CsopaActivitatDto>>> GetAll()
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await _csopaService.GetAllAsync(userId.Value));
    }

    [HttpPost]
    public async Task<ActionResult<CsopaActivitatDto>> Create([FromBody] CsopaActivitatCreateDto dto)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _csopaService.CreateAsync(userId.Value, dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return StatusCode(StatusCodes.Status201Created, result.Activitat);
    }

    [HttpPost("{id:int}/assistencies")]
    public async Task<ActionResult<CsopaActivitatDto>> MarcarAssistencia(
        int id,
        [FromBody] CsopaAssistenciaCreateDto dto)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _csopaService.MarcarAssistenciaAsync(id, userId.Value, dto);

        if (!result.Success)
        {
            if (result.Error == "Activitat no trobada.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Activitat);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteActivitat(int id)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _csopaService.DeleteActivitatAsync(id, userId.Value);

        if (!result.Success)
        {
            if (result.Error == "Activitat no trobada.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return NoContent();
    }

    [HttpDelete("{id:int}/assistencies/{assistenciaId:int}")]
    public async Task<ActionResult<CsopaActivitatDto>> DeleteAssistencia(int id, int assistenciaId)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _csopaService.DeleteAssistenciaAsync(id, assistenciaId, userId.Value);

        if (!result.Success)
        {
            if (result.Error == "Activitat no trobada." || result.Error == "Assistència no trobada.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Activitat);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
