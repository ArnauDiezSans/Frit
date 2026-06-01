using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class PartidaService
{
    private readonly AppDbContext _context;

    public PartidaService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PartidaDto>> GetAllAsync()
    {
        return await _context.Partidas
            .OrderByDescending(p => p.Fecha)
            .ThenByDescending(p => p.PartidaId)
            .Select(p => new PartidaDto
            {
                PartidaId = p.PartidaId,
                JuegoId = p.JuegoId,
                Fecha = p.Fecha,
                DuracionMinutos = p.DuracionMinutos,
                NumeroJugadores = p.NumeroJugadores,
                Observaciones = p.Observaciones,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<PartidaDto?> GetByIdAsync(int id)
    {
        return await _context.Partidas
            .Where(p => p.PartidaId == id)
            .Select(p => new PartidaDto
            {
                PartidaId = p.PartidaId,
                JuegoId = p.JuegoId,
                Fecha = p.Fecha,
                DuracionMinutos = p.DuracionMinutos,
                NumeroJugadores = p.NumeroJugadores,
                Observaciones = p.Observaciones,
                CreatedAt = p.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Success, string? Error, PartidaDto? Partida)> CreateAsync(PartidaDto dto)
    {
        var juegoExiste = await _context.Juegos.AnyAsync(j => j.JuegoId == dto.JuegoId);
        if (!juegoExiste)
        {
            return (false, "El JuegoId indicado no existe.", null);
        }

        var partida = new Partida
        {
            JuegoId = dto.JuegoId,
            Fecha = dto.Fecha,
            DuracionMinutos = dto.DuracionMinutos,
            NumeroJugadores = dto.NumeroJugadores,
            Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim()
        };

        _context.Partidas.Add(partida);
        await _context.SaveChangesAsync();

        return (true, null, new PartidaDto
        {
            PartidaId = partida.PartidaId,
            JuegoId = partida.JuegoId,
            Fecha = partida.Fecha,
            DuracionMinutos = partida.DuracionMinutos,
            NumeroJugadores = partida.NumeroJugadores,
            Observaciones = partida.Observaciones,
            CreatedAt = partida.CreatedAt
        });
    }

    public async Task<(bool Success, string? Error, PartidaDto? Partida)> UpdateAsync(int id, PartidaDto dto)
    {
        if (id != dto.PartidaId)
        {
            return (false, "El id de la ruta no coincide con el PartidaId del body.", null);
        }

        var partida = await _context.Partidas.FirstOrDefaultAsync(p => p.PartidaId == id);
        if (partida is null)
        {
            return (false, "Partida no encontrada.", null);
        }

        var juegoExiste = await _context.Juegos.AnyAsync(j => j.JuegoId == dto.JuegoId);
        if (!juegoExiste)
        {
            return (false, "El JuegoId indicado no existe.", null);
        }

        partida.JuegoId = dto.JuegoId;
        partida.Fecha = dto.Fecha;
        partida.DuracionMinutos = dto.DuracionMinutos;
        partida.NumeroJugadores = dto.NumeroJugadores;
        partida.Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim();

        await _context.SaveChangesAsync();

        return (true, null, new PartidaDto
        {
            PartidaId = partida.PartidaId,
            JuegoId = partida.JuegoId,
            Fecha = partida.Fecha,
            DuracionMinutos = partida.DuracionMinutos,
            NumeroJugadores = partida.NumeroJugadores,
            Observaciones = partida.Observaciones,
            CreatedAt = partida.CreatedAt
        });
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var partida = await _context.Partidas.FirstOrDefaultAsync(p => p.PartidaId == id);

        if (partida is null)
        {
            return false;
        }

        _context.Partidas.Remove(partida);
        await _context.SaveChangesAsync();

        return true;
    }
}