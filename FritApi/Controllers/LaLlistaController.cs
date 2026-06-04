using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/la-llista")]
public class LaLlistaController : ControllerBase
{
    private readonly LaLlistaService _laLlistaService;

    public LaLlistaController(LaLlistaService laLlistaService)
    {
        _laLlistaService = laLlistaService;
    }

    [HttpGet]
    public async Task<ActionResult<List<LaLlistaItemDto>>> GetAll()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var items = await _laLlistaService.GetAllAsync(today);
        return Ok(items);
    }
}
