using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Controllers;

[ApiController, Authorize, Route("api/fritpartys")]
public class FritPartysController(AppDbContext db, FritPartyService service) : ControllerBase
{
    private bool CanEdit => string.Equals(User.Identity?.Name?.Trim(), "Arnau", StringComparison.OrdinalIgnoreCase);
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var parties = await db.FritPartys.AsNoTracking().OrderByDescending(p => p.Inicio).ThenByDescending(p => p.FritPartyId).ToListAsync();
        var results = new List<FritPartyDto>();
        foreach (var party in parties) results.Add(await service.Get(party));
        return Ok(new { ediciones = results, juegosSinPeso = await service.MissingWeights() });
    }

    [HttpPost]
    public async Task<IActionResult> Create(FritPartyRequest request)
    {
        var error = await service.Validate(request);
        if (error != null) return BadRequest(new { message = error });
        var party = new FritParty { Nombre = request.Nombre.Trim(), Inicio = request.Inicio, Fin = request.Fin };
        db.FritPartys.Add(party);
        await db.SaveChangesAsync();
        await service.FreezeDue();
        return Ok(new { party.FritPartyId });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, FritPartyRequest request)
    {
        if (!CanEdit) return Forbid();
        var party = await db.FritPartys.FirstOrDefaultAsync(p => p.FritPartyId == id);
        if (party == null) return NotFound();
        var error = await service.Validate(request, party.Inicio != request.Inicio || party.Fin != request.Fin);
        if (error != null) return BadRequest(new { message = error });
        // Changing dates is an explicit correction by Arnau, reopening and rebuilding the edition.
        if (party.Inicio != request.Inicio || party.Fin != request.Fin)
        {
            party.Snapshot = null;
            party.FrozenAt = null;
        }
        party.Nombre = request.Nombre.Trim(); party.Inicio = request.Inicio; party.Fin = request.Fin;
        await db.SaveChangesAsync();
        await service.FreezeDue();
        return NoContent();
    }

    [HttpPost("{id:int}/recalcular")]
    public async Task<IActionResult> Recalculate(int id)
    {
        if (!CanEdit) return Forbid();
        var party = await db.FritPartys.FirstOrDefaultAsync(p => p.FritPartyId == id);
        if (party == null) return NotFound();
        var missing = await service.MissingWeights();
        if (missing.Count > 0) return BadRequest(new { message = "Cal completar els pesos BGG: " + string.Join(", ", missing) });
        party.Snapshot = null; party.FrozenAt = null;
        await db.SaveChangesAsync();
        await service.FreezeDue();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!CanEdit) return Forbid();
        var party = await db.FritPartys.FirstOrDefaultAsync(p => p.FritPartyId == id);
        if (party == null) return NotFound();
        db.Remove(party); await db.SaveChangesAsync(); return NoContent();
    }
}
