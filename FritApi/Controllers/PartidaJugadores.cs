using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PartidaJugadoresController : ControllerBase
{
    private readonly PartidaJugadorService _service;

    public PartidaJugadoresController(PartidaJugadorService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<List<PartidaJugadorDto>>> GetAll()
    {
        var items = await _service.GetAllAsync();
        return Ok(items);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PartidaJugadorDto>> GetById(int id)
    {
        var item = await _service.GetByIdAsync(id);

        if (item is null)
        {
            return NotFound();
        }

        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<PartidaJugadorDto>> Create([FromBody] PartidaJugadorDto dto)
    {
        var result = await _service.CreateAsync(dto);

        if (!result.Success)
        {
            return BadRequest(new { message = result.Error });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Item!.PartidaJugadorId }, result.Item);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PartidaJugadorDto>> Update(int id, [FromBody] PartidaJugadorDto dto)
    {
        var result = await _service.UpdateAsync(id, dto);

        if (!result.Success)
        {
            if (result.Error == "PartidaJugador no encontrado.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return Ok(result.Item);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _service.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}