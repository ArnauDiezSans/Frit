using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class JuegoService
{
    private readonly AppDbContext _context;

    public JuegoService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<JuegoDto>> GetAllAsync()
    {
        return await _context.Juegos
            .OrderBy(j => j.Nombre)
            .Select(j => new JuegoDto
            {
                JuegoId = j.JuegoId,
                Nombre = j.Nombre,
                BggId = j.BggId,
                DificultadBgg = j.DificultadBgg,
                NumeroJugadoresMin = j.NumeroJugadoresMin,
                NumeroJugadoresMax = j.NumeroJugadoresMax,
                Pvp = j.Pvp,
                PropietarioId = j.PropietarioId,
                FechaAdquisicion = j.FechaAdquisicion,
                Tipo = j.Tipo,
                JuegoBaseId = j.JuegoBaseId
            })
            .ToListAsync();
    }

    public async Task<JuegoDto?> GetByIdAsync(int id)
    {
        return await _context.Juegos
            .Where(j => j.JuegoId == id)
            .Select(j => new JuegoDto
            {
                JuegoId = j.JuegoId,
                Nombre = j.Nombre,
                BggId = j.BggId,
                DificultadBgg = j.DificultadBgg,
                NumeroJugadoresMin = j.NumeroJugadoresMin,
                NumeroJugadoresMax = j.NumeroJugadoresMax,
                Pvp = j.Pvp,
                PropietarioId = j.PropietarioId,
                FechaAdquisicion = j.FechaAdquisicion,
                Tipo = j.Tipo,
                JuegoBaseId = j.JuegoBaseId
            })
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Success, string? Error, JuegoDto? Juego)> CreateAsync(JuegoDto dto)
    {
        if (dto.NumeroJugadoresMin > dto.NumeroJugadoresMax)
        {
            return (false, "NumeroJugadoresMin no puede ser mayor que NumeroJugadoresMax.", null);
        }

        var propietarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == dto.PropietarioId);
        if (!propietarioExiste)
        {
            return (false, "El PropietarioId indicado no existe.", null);
        }

        if (dto.JuegoBaseId.HasValue)
        {
            var juegoBaseExiste = await _context.Juegos.AnyAsync(j => j.JuegoId == dto.JuegoBaseId.Value);
            if (!juegoBaseExiste)
            {
                return (false, "El JuegoBaseId indicado no existe.", null);
            }
        }

        var juego = new Juego
        {
            Nombre = dto.Nombre.Trim(),
            BggId = dto.BggId,
            DificultadBgg = dto.DificultadBgg,
            NumeroJugadoresMin = dto.NumeroJugadoresMin,
            NumeroJugadoresMax = dto.NumeroJugadoresMax,
            Pvp = dto.Pvp,
            PropietarioId = dto.PropietarioId,
            FechaAdquisicion = dto.FechaAdquisicion,
            Tipo = dto.Tipo.Trim(),
            JuegoBaseId = dto.JuegoBaseId
        };

        _context.Juegos.Add(juego);
        await _context.SaveChangesAsync();

        dto.JuegoId = juego.JuegoId;
        return (true, null, dto);
    }

    public async Task<(bool Success, string? Error, JuegoDto? Juego)> UpdateAsync(int id, JuegoDto dto)
    {
        if (id != dto.JuegoId)
        {
            return (false, "El id de la ruta no coincide con el JuegoId del body.", null);
        }

        if (dto.NumeroJugadoresMin > dto.NumeroJugadoresMax)
        {
            return (false, "NumeroJugadoresMin no puede ser mayor que NumeroJugadoresMax.", null);
        }

        var juego = await _context.Juegos.FirstOrDefaultAsync(j => j.JuegoId == id);
        if (juego is null)
        {
            return (false, "Juego no encontrado.", null);
        }

        var propietarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == dto.PropietarioId);
        if (!propietarioExiste)
        {
            return (false, "El PropietarioId indicado no existe.", null);
        }

        if (dto.JuegoBaseId.HasValue)
        {
            if (dto.JuegoBaseId.Value == id)
            {
                return (false, "Un juego no puede ser su propio juego base.", null);
            }

            var juegoBaseExiste = await _context.Juegos.AnyAsync(j => j.JuegoId == dto.JuegoBaseId.Value);
            if (!juegoBaseExiste)
            {
                return (false, "El JuegoBaseId indicado no existe.", null);
            }
        }

        juego.BggId = dto.BggId;
        juego.DificultadBgg = dto.DificultadBgg;
        juego.NumeroJugadoresMin = dto.NumeroJugadoresMin;
        juego.NumeroJugadoresMax = dto.NumeroJugadoresMax;
        juego.Pvp = dto.Pvp;
        juego.PropietarioId = dto.PropietarioId;
        juego.FechaAdquisicion = dto.FechaAdquisicion;
        juego.Tipo = dto.Tipo.Trim();
        juego.JuegoBaseId = dto.JuegoBaseId;

        await _context.SaveChangesAsync();

        return (true, null, dto);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var juego = await _context.Juegos.FirstOrDefaultAsync(j => j.JuegoId == id);

        if (juego is null)
        {
            return false;
        }

        _context.Juegos.Remove(juego);
        await _context.SaveChangesAsync();

        return true;
    }
}