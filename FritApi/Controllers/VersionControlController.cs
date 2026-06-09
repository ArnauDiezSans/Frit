using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/version-control")]
public class VersionControlController : ControllerBase
{
    private readonly VersionControlService versionControlService;

    public VersionControlController(VersionControlService versionControlService)
    {
        this.versionControlService = versionControlService;
    }

    [HttpGet]
    public async Task<ActionResult<VersionControlDto>> Get()
    {
        try
        {
            return Ok(await versionControlService.GetAsync());
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
