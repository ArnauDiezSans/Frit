using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/rankings")]
public class RankingsController : ControllerBase
{
    private readonly RankingsService rankingsService;

    public RankingsController(RankingsService rankingsService)
    {
        this.rankingsService = rankingsService;
    }

    [HttpGet]
    public async Task<ActionResult<RankingsDto>> Get()
    {
        return Ok(await rankingsService.GetAsync());
    }
}
