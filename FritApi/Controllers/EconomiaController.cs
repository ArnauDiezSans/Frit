using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController, Authorize, Route("api/economia")]
public class EconomiaController(EconomiaService service) : ControllerBase
{
    private bool Authorized() => EconomiaAccess.IsAuthorized(User);
    [HttpGet] public async Task<ActionResult<EconomiaDashboardDto>> Get() => Authorized() ? Ok(await service.GetAsync()) : Forbid();
    [HttpPost("preview")] public async Task<ActionResult<IReadOnlyList<EconomiaPreviewRowDto>>> Preview(EconomiaPreviewRequest request) => Authorized() ? Ok(await service.PreviewAsync(request.Text)) : Forbid();
    [HttpPost("import")] public async Task<ActionResult<EconomiaImportResultDto>> Import(EconomiaImportRequest request) => Authorized() ? Ok(await service.ImportAsync(request.Moviments)) : Forbid();
    [HttpPatch("moviments/{id:int}/descriptor")] public async Task<IActionResult> Descriptor(int id, EconomiaDescriptorRequest request) { if (!Authorized()) return Forbid(); if (string.IsNullOrWhiteSpace(request.Descriptor)) return BadRequest(); return await service.UpdateDescriptorAsync(id, request.Descriptor) ? NoContent() : NotFound(); }
}
