using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/pendent-compra")]
public class PendentCompraController : ControllerBase
{
    private readonly PendentCompraService _pendentCompraService;

    public PendentCompraController(PendentCompraService pendentCompraService)
    {
        _pendentCompraService = pendentCompraService;
    }

    [HttpGet]
    public async Task<ActionResult<List<PendentCompraDto>>> GetAll()
    {
        var items = await _pendentCompraService.GetAllAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<ActionResult<PendentCompraDto>> Create([FromBody] PendentCompraWriteDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized();
        }

        var result = await _pendentCompraService.CreateAsync(userId, dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return StatusCode(StatusCodes.Status201Created, result.Item);
    }

    [HttpPost("delete-selected")]
    public async Task<IActionResult> DeleteSelected([FromBody] PendentCompraDeleteSelectedDto dto)
    {
        await _pendentCompraService.DeleteSelectedAsync(dto.Ids);
        return NoContent();
    }
}
