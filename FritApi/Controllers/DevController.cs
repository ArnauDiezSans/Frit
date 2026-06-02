using FritApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevController : ControllerBase
{
    private readonly PasswordService _passwordService;

    public DevController(PasswordService passwordService)
    {
        _passwordService = passwordService;
    }

    [HttpGet("hash-password")]
    public ActionResult<string> HashPassword([FromQuery] string password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return BadRequest("Debes enviar ?password=...");
        }

        var hash = _passwordService.HashPassword(password);
        return Ok(hash);
    }
}