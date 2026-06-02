using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class PartidaJugadorService
{
    private readonly AppDbContext _context;

    public PartidaJugadorService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PartidaJugadorDto>> GetAllAsync()
    {
        return await _context.PartidaJugadores
            .OrderBy(pj => pj.PartidaId)
            .ThenBy(pj => pj.Posicion)
            .Select(pj => new PartidaJugadorDto
            {
                PartidaJugadorId = pj.PartidaJugadorId,
                PartidaId = pj.PartidaId,
                UsuarioId = pj.UsuarioId,
                NombreMostrado = pj.NombreMostrado,
                Posicion = pj.Posicion,
                Puntos = pj.Puntos
            })
            .ToListAsync();
    }

    public async Task<PartidaJugadorDto?> GetByIdAsync(int id)
    {
        return await _context.PartidaJugadores
            .Where(pj => pj.PartidaJugadorId == id)
            .Select(pj => new PartidaJugadorDto
            {
                PartidaJugadorId = pj.PartidaJugadorId,
                PartidaId = pj.PartidaId,
                UsuarioId = pj.UsuarioId,
                NombreMostrado = pj.NombreMostrado,
                Posicion = pj.Posicion,
                Puntos = pj.Puntos
            })
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Success, string? Error, PartidaJugadorDto? Item)> CreateAsync(PartidaJugadorDto dto)
    {
        var partidaExiste = await _context.Partidas.AnyAsync(p => p.PartidaId == dto.PartidaId);
        if (!partidaExiste)
        {
            return (false, "L'identificador de partida indicat no existeix.", null);
        }

        if (dto.UsuarioId.HasValue)
        {
            var usuarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == dto.UsuarioId.Value);
            if (!usuarioExiste)
            {
                return (false, "L'identificador d'usuari indicat no existeix.", null);
            }
        }

        var posicionDuplicada = await _context.PartidaJugadores
            .AnyAsync(pj => pj.PartidaId == dto.PartidaId && pj.Posicion == dto.Posicion);

        if (posicionDuplicada)
        {
            return (false, "Ja existeix un jugador amb aquesta posició a la partida.", null);
        }

        var item = new PartidaJugador
        {
            PartidaId = dto.PartidaId,
            UsuarioId = dto.UsuarioId,
            NombreMostrado = dto.NombreMostrado.Trim(),
            Posicion = dto.Posicion,
            Puntos = dto.Puntos
        };

        _context.PartidaJugadores.Add(item);
        await _context.SaveChangesAsync();

        return (true, null, new PartidaJugadorDto
        {
            PartidaJugadorId = item.PartidaJugadorId,
            PartidaId = item.PartidaId,
            UsuarioId = item.UsuarioId,
            NombreMostrado = item.NombreMostrado,
            Posicion = item.Posicion,
            Puntos = item.Puntos
        });
    }

    public async Task<(bool Success, string? Error, PartidaJugadorDto? Item)> UpdateAsync(int id, PartidaJugadorDto dto)
    {
        if (id != dto.PartidaJugadorId)
        {
            return (false, "L'identificador de la ruta no coincideix amb el PartidaJugadorId del cos de la petició.", null);
        }

        var item = await _context.PartidaJugadores.FirstOrDefaultAsync(pj => pj.PartidaJugadorId == id);
        if (item is null)
        {
            return (false, "Jugador de partida no trobat.", null);
        }

        var partidaExiste = await _context.Partidas.AnyAsync(p => p.PartidaId == dto.PartidaId);
        if (!partidaExiste)
        {
            return (false, "L'identificador de partida indicat no existeix.", null);
        }

        if (dto.UsuarioId.HasValue)
        {
            var usuarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == dto.UsuarioId.Value);
            if (!usuarioExiste)
            {
                return (false, "L'identificador d'usuari indicat no existeix.", null);
            }
        }

        var posicionDuplicada = await _context.PartidaJugadores.AnyAsync(pj =>
            pj.PartidaId == dto.PartidaId &&
            pj.Posicion == dto.Posicion &&
            pj.PartidaJugadorId != id);

        if (posicionDuplicada)
        {
            return (false, "Ja existeix un jugador amb aquesta posició a la partida.", null);
        }

        item.PartidaId = dto.PartidaId;
        item.UsuarioId = dto.UsuarioId;
        item.NombreMostrado = dto.NombreMostrado.Trim();
        item.Posicion = dto.Posicion;
        item.Puntos = dto.Puntos;

        await _context.SaveChangesAsync();

        return (true, null, new PartidaJugadorDto
        {
            PartidaJugadorId = item.PartidaJugadorId,
            PartidaId = item.PartidaId,
            UsuarioId = item.UsuarioId,
            NombreMostrado = item.NombreMostrado,
            Posicion = item.Posicion,
            Puntos = item.Puntos
        });
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var item = await _context.PartidaJugadores.FirstOrDefaultAsync(pj => pj.PartidaJugadorId == id);

        if (item is null)
        {
            return false;
        }

        _context.PartidaJugadores.Remove(item);
        await _context.SaveChangesAsync();

        return true;
    }
}