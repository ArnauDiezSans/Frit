using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class UsuarioJuegoOrdenService
{
    private readonly AppDbContext _context;

    public UsuarioJuegoOrdenService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<UsuarioJuegoOrdenDto>?> GetOrdenAsync(int usuarioId)
    {
        var usuarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == usuarioId);

        if (!usuarioExiste)
        {
            return null;
        }

        await EnsureOrdenCompletoAsync(usuarioId);

        return await _context.UsuarioJuegoOrdenes
            .Where(o => o.UsuarioId == usuarioId)
            .OrderBy(o => o.Posicion)
            .ThenBy(o => o.Juego.Nombre)
            .Select(o => new UsuarioJuegoOrdenDto
            {
                JuegoId = o.JuegoId,
                Nombre = o.Juego.Nombre,
                Posicion = o.Posicion
            })
            .ToListAsync();
    }

    public async Task<(bool Success, string? Error)> UpdateOrdenAsync(
        int usuarioId,
        UsuarioJuegoOrdenUpdateDto dto)
    {
        var usuarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == usuarioId);

        if (!usuarioExiste)
        {
            return (false, "Usuari no trobat.");
        }

        await EnsureOrdenCompletoAsync(usuarioId);

        var juegosIds = await _context.Juegos
            .OrderBy(j => j.Nombre)
            .Select(j => j.JuegoId)
            .ToListAsync();

        var requestedIds = dto.Juegos.Select(j => j.JuegoId).ToList();
        var requestedPositions = dto.Juegos.Select(j => j.Posicion).ToList();

        if (requestedIds.Count != juegosIds.Count || requestedIds.Distinct().Count() != requestedIds.Count)
        {
            return (false, "L'ordre ha d'incloure cada joc una sola vegada.");
        }

        if (requestedPositions.Distinct().Count() != requestedPositions.Count ||
            requestedPositions.Any(p => p < 1 || p > juegosIds.Count))
        {
            return (false, "Les posicions no són vàlides.");
        }

        if (requestedIds.Except(juegosIds).Any() || juegosIds.Except(requestedIds).Any())
        {
            return (false, "L'ordre ha d'incloure tots els jocs registrats.");
        }

        var ordenes = await _context.UsuarioJuegoOrdenes
            .Where(o => o.UsuarioId == usuarioId)
            .ToListAsync();

        var nextPositions = dto.Juegos.ToDictionary(j => j.JuegoId, j => j.Posicion);

        foreach (var orden in ordenes)
        {
            orden.Posicion = -orden.Posicion;
        }

        await _context.SaveChangesAsync();

        foreach (var orden in ordenes)
        {
            orden.Posicion = nextPositions[orden.JuegoId];
        }

        await _context.SaveChangesAsync();
        return (true, null);
    }

    public async Task EnsureOrdenCompletoAsync(int usuarioId)
    {
        var juegos = await _context.Juegos
            .OrderBy(j => j.Nombre)
            .Select(j => j.JuegoId)
            .ToListAsync();

        var ordenes = await _context.UsuarioJuegoOrdenes
            .Where(o => o.UsuarioId == usuarioId)
            .OrderBy(o => o.Posicion)
            .ToListAsync();

        var existingJuegoIds = ordenes.Select(o => o.JuegoId).ToHashSet();
        var removedOrdenes = ordenes.Where(o => !juegos.Contains(o.JuegoId)).ToList();

        if (removedOrdenes.Count > 0)
        {
            _context.UsuarioJuegoOrdenes.RemoveRange(removedOrdenes);
            ordenes = ordenes.Except(removedOrdenes).ToList();
        }

        var nextPosition = ordenes.Count == 0 ? 1 : ordenes.Max(o => o.Posicion) + 1;

        foreach (var juegoId in juegos.Where(id => !existingJuegoIds.Contains(id)))
        {
            var orden = new UsuarioJuegoOrden
            {
                UsuarioId = usuarioId,
                JuegoId = juegoId,
                Posicion = nextPosition++
            };

            _context.UsuarioJuegoOrdenes.Add(orden);
            ordenes.Add(orden);
        }

        var normalized = ordenes
            .OrderBy(o => o.Posicion)
            .ThenBy(o => juegos.IndexOf(o.JuegoId))
            .ToList();

        for (var index = 0; index < normalized.Count; index++)
        {
            normalized[index].Posicion = index + 1;
        }

        await _context.SaveChangesAsync();
    }
}
