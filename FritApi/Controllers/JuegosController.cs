using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class JuegosController : ControllerBase
{
    private readonly JuegoService _juegoService;

    public JuegosController(JuegoService juegoService)
    {
        _juegoService = juegoService;
    }

    [HttpGet]
    public async Task<ActionResult<List<JuegoDto>>> GetAll()
    {
        var juegos = await _juegoService.GetAllAsync();
        return Ok(juegos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<JuegoDto>> GetById(int id)
    {
        var juego = await _juegoService.GetByIdAsync(id);

        if (juego is null)
        {
            return NotFound();
        }

        return Ok(juego);
    }

    [HttpGet("bgg/{bggId:int}")]
    public async Task<ActionResult<BggJuegoLookupDto>> GetFromBgg(int bggId)
    {
        var result = await _juegoService.GetFromBggAsync(bggId);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Juego);
    }

    [HttpPost]
    public async Task<ActionResult<JuegoDto>> Create([FromBody] JuegoDto dto)
    {
        var result = await _juegoService.CreateAsync(dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Juego!.JuegoId }, result.Juego);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<JuegoDto>> Update(int id, [FromBody] JuegoDto dto)
    {
        var result = await _juegoService.UpdateAsync(id, dto);

        if (!result.Success)
        {
            if (result.Error == "Joc no trobat.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Juego);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _juegoService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}
