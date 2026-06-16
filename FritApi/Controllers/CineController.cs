using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/cine")]
public class CineController : ControllerBase
{
    private readonly CineService _cineService;

    public CineController(CineService cineService)
    {
        _cineService = cineService;
    }

    [HttpGet]
    public async Task<ActionResult<List<CinePeliculaDto>>> GetAll()
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await _cineService.GetAllAsync(userId.Value));
    }

    [HttpPost]
    public async Task<ActionResult<CinePeliculaDto>> Create([FromBody] CinePeliculaCreateDto dto)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _cineService.CreateAsync(userId.Value, dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return StatusCode(StatusCodes.Status201Created, result.Pelicula);
    }

    [HttpPost("{id:int}/valoracions")]
    public async Task<ActionResult<CinePeliculaDto>> Valorar(
        int id,
        [FromBody] CineValoracionCreateDto dto)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _cineService.ValorarAsync(id, userId.Value, dto);

        if (!result.Success)
        {
            if (result.Error == "Pel·lícula no trobada.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Pelicula);
    }

    [HttpPost("{id:int}/assistencies")]
    public async Task<ActionResult<CinePeliculaDto>> MarcarAsistencia(
        int id,
        [FromBody] CineAsistenciaCreateDto dto)
    {
        var userId = GetCurrentUserId();

        if (userId is null)
        {
            return Unauthorized();
        }

        var result = await _cineService.MarcarAsistenciaAsync(id, userId.Value, dto);

        if (!result.Success)
        {
            if (result.Error == "Pel·lícula no trobada.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Pelicula);
    }

    private int? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}
