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
    [HttpPost("moviments/{id:int}/assignar-quota")] public async Task<IActionResult> AssignarQuota(int id, EconomiaAssignacioRequest request) { if (!Authorized()) return Forbid(); var error = await service.AssignQuotaAsync(id, request); return error is null ? NoContent() : BadRequest(new { message = error }); }
    [HttpDelete("moviments/{id:int}/assignacions")] public async Task<IActionResult> DesferAssignacions(int id) { if (!Authorized()) return Forbid(); return await service.UndoAssignmentsAsync(id) ? NoContent() : NotFound(); }
    [HttpPost("assignar-automaticament")] public async Task<ActionResult<EconomiaAutoAssignacioResultDto>> AssignarAutomaticament() => Authorized() ? Ok(await service.AutoAssignAsync()) : Forbid();
}
