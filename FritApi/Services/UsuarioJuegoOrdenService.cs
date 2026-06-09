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
            .OrderByDescending(o => o.Puntuacion)
            .ThenBy(o => o.Juego.Nombre)
            .Select(o => new UsuarioJuegoOrdenDto
            {
                JuegoId = o.JuegoId,
                Nombre = o.Juego.Nombre,
                Puntuacion = o.Puntuacion
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

        if (requestedIds.Count != juegosIds.Count || requestedIds.Distinct().Count() != requestedIds.Count)
        {
            return (false, "Les puntuacions han d'incloure cada joc una sola vegada.");
        }

        if (requestedIds.Except(juegosIds).Any() || juegosIds.Except(requestedIds).Any())
        {
            return (false, "Les puntuacions han d'incloure tots els jocs registrats.");
        }

        if (dto.Juegos.Any(j => j.Puntuacion < 0 || j.Puntuacion > 10))
        {
            return (false, "Les puntuacions han d'estar entre 0 i 10.");
        }

        var ordenes = await _context.UsuarioJuegoOrdenes
            .Where(o => o.UsuarioId == usuarioId)
            .ToListAsync();

        var nextPuntuaciones = dto.Juegos.ToDictionary(j => j.JuegoId, j => j.Puntuacion);

        foreach (var orden in ordenes)
        {
            orden.Puntuacion = nextPuntuaciones[orden.JuegoId];
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
            .ToListAsync();

        var existingJuegoIds = ordenes.Select(o => o.JuegoId).ToHashSet();
        var removedOrdenes = ordenes.Where(o => !juegos.Contains(o.JuegoId)).ToList();

        if (removedOrdenes.Count > 0)
        {
            _context.UsuarioJuegoOrdenes.RemoveRange(removedOrdenes);
            ordenes = ordenes.Except(removedOrdenes).ToList();
        }

        foreach (var juegoId in juegos.Where(id => !existingJuegoIds.Contains(id)))
        {
            var orden = new UsuarioJuegoOrden
            {
                UsuarioId = usuarioId,
                JuegoId = juegoId,
                Puntuacion = 0
            };

            _context.UsuarioJuegoOrdenes.Add(orden);
        }

        await _context.SaveChangesAsync();
    }
}
