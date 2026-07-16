using System.Security.Claims;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class UsuariosController : ControllerBase
{
    private readonly UsuarioService _usuarioService;
    private readonly UsuarioJuegoOrdenService _usuarioJuegoOrdenService;

    public UsuariosController(
        UsuarioService usuarioService,
        UsuarioJuegoOrdenService usuarioJuegoOrdenService)
    {
        _usuarioService = usuarioService;
        _usuarioJuegoOrdenService = usuarioJuegoOrdenService;
    }

    [HttpGet]
    public async Task<ActionResult<List<UsuarioDto>>> GetAll()
    {
        var usuarios = await _usuarioService.GetAllAsync();
        return Ok(usuarios);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsuarioDto>> GetById(int id)
    {
        var usuario = await _usuarioService.GetByIdAsync(id);

        if (usuario is null)
        {
            return NotFound();
        }

        return Ok(usuario);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UsuarioDto>> Create([FromBody] UsuarioWriteDto dto)
    {
        var usuario = await _usuarioService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = usuario.UsuarioId }, usuario);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<UsuarioDto>> Update(int id, [FromBody] UsuarioWriteDto dto)
    {
        var usuario = await _usuarioService.UpdateAsync(id, dto);

        if (usuario is null)
        {
            return NotFound();
        }

        return Ok(usuario);
    }

    [HttpPut("{id:int}/password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto dto)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(userIdClaim) || !int.TryParse(userIdClaim, out var currentUserId))
        {
            return Unauthorized();
        }

        if (currentUserId != id)
        {
            return Forbid();
        }

        var result = await _usuarioService.ChangePasswordAsync(id, dto);

        if (result is null)
        {
            return NotFound();
        }

        if (result == false)
        {
            return BadRequest(new { message = "La contrasenya antiga no és correcta." });
        }

        return NoContent();
    }

    [HttpPut("{id:int}/profile")]
    [Authorize]
    public async Task<ActionResult<UsuarioDto>> UpdateProfile(int id, [FromBody] UsuarioProfileUpdateDto dto)
    {
        if (!IsCurrentUser(id))
        {
            return Forbid();
        }

        var usuario = await _usuarioService.UpdateProfileAsync(id, dto);

        if (usuario is null)
        {
            return NotFound();
        }

        return Ok(usuario);
    }

    [HttpGet("{id:int}/juegos-orden")]
    [Authorize]
    public async Task<ActionResult<List<UsuarioJuegoOrdenDto>>> GetJuegosOrden(int id)
    {
        var orden = await _usuarioJuegoOrdenService.GetOrdenAsync(id);

        if (orden is null)
        {
            return NotFound();
        }

        return Ok(orden);
    }

    [HttpPut("{id:int}/juegos-orden")]
    [Authorize]
    public async Task<IActionResult> UpdateJuegosOrden(int id, [FromBody] UsuarioJuegoOrdenUpdateDto dto)
    {
        if (!IsCurrentUser(id))
        {
            return Forbid();
        }

        var result = await _usuarioJuegoOrdenService.UpdateOrdenAsync(id, dto);

        if (!result.Success)
        {
            if (result.Error == "Usuari no trobat.")
            {
                return NotFound();
            }

            return BadRequest(new { message = result.Error });
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _usuarioService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    private bool IsCurrentUser(int id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(userIdClaim, out var currentUserId) && currentUserId == id;
    }
}
