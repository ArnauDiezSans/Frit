using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController, Authorize, Route("api/encuestas")]
public sealed class EncuestasController(EncuestaService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<EncuestaResumenDto>>> GetAll() =>
        Ok(await service.GetAllAsync(UserId, User.IsInRole("Admin")));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EncuestaDetalleDto>> Get(int id)
    {
        var result = await service.GetAsync(id, UserId, User.IsInRole("Admin"));
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EncuestaWriteDto dto)
    {
        var result = await service.CreateAsync(UserId, dto);
        return result.Success ? CreatedAtAction(nameof(Get), new { id = result.Id }, new { encuestaId = result.Id }) : BadRequest(new { message = result.Error });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] EncuestaWriteDto dto)
    {
        var result = await service.UpdateAsync(id, UserId, User.IsInRole("Admin"), dto);
        return result.Success ? NoContent() : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/publicar")]
    public async Task<IActionResult> Publish(int id)
    {
        var result = await service.PublishAsync(id, UserId, User.IsInRole("Admin"));
        return result.Success ? NoContent() : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/cerrar")]
    public async Task<IActionResult> Close(int id)
    {
        var result = await service.CloseAsync(id, UserId, User.IsInRole("Admin"));
        return result.Success ? NoContent() : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/recordar")]
    public async Task<IActionResult> Remind(int id)
    {
        var result = await service.RemindAsync(id, UserId, User.IsInRole("Admin"));
        return result.Success ? Ok(new { destinatarios = result.Count }) : BadRequest(new { message = result.Error });
    }

    [HttpPost("{id:int}/respuestas")]
    public async Task<IActionResult> Submit(int id, [FromBody] EncuestaSubmitDto dto)
    {
        var result = await service.SubmitAsync(id, UserId, dto);
        return result.Success ? NoContent() : BadRequest(new { message = result.Error });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await service.DeleteAsync(id, UserId, User.IsInRole("Admin"));
        return result.Success ? NoContent() : BadRequest(new { message = result.Error });
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
