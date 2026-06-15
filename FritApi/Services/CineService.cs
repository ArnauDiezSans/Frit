using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class CineService
{
    private static readonly TimeSpan VotingWindow = TimeSpan.FromHours(24);
    private readonly AppDbContext _context;

    public CineService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CinePeliculaDto>> GetAllAsync(int usuarioId)
    {
        var peliculas = await _context.CinePeliculas
            .Include(pelicula => pelicula.UsuarioCreador)
            .Include(pelicula => pelicula.Valoraciones)
                .ThenInclude(valoracion => valoracion.Usuario)
            .OrderByDescending(pelicula => pelicula.CreatedAt)
            .ThenByDescending(pelicula => pelicula.CinePeliculaId)
            .ToListAsync();

        return peliculas.Select(pelicula => ToDto(pelicula, usuarioId, DateTime.UtcNow)).ToList();
    }

    public async Task<(bool Success, string? Error, CinePeliculaDto? Pelicula)> CreateAsync(
        int usuarioId,
        CinePeliculaCreateDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);

        if (usuario is null)
        {
            return (false, "Usuari no trobat.", null);
        }

        if (ExternalUserPolicy.IsExternal(usuario))
        {
            return (false, "L'usuari Extern no pot publicar pel·lícules.", null);
        }

        var titulo = dto.Titulo.Trim();

        if (string.IsNullOrWhiteSpace(titulo))
        {
            return (false, "El títol és obligatori.", null);
        }

        var pelicula = new CinePelicula
        {
            Titulo = titulo,
            UsuarioCreadorId = usuarioId
        };

        _context.CinePeliculas.Add(pelicula);
        await _context.SaveChangesAsync();

        pelicula.UsuarioCreador = usuario;

        return (true, null, ToDto(pelicula, usuarioId, DateTime.UtcNow));
    }

    public async Task<(bool Success, string? Error, CinePeliculaDto? Pelicula)> ValorarAsync(
        int peliculaId,
        int usuarioId,
        CineValoracionCreateDto dto)
    {
        var now = DateTime.UtcNow;
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);

        if (usuario is null)
        {
            return (false, "Usuari no trobat.", null);
        }

        if (ExternalUserPolicy.IsExternal(usuario))
        {
            return (false, "L'usuari Extern no pot valorar pel·lícules.", null);
        }

        var pelicula = await _context.CinePeliculas
            .Include(item => item.UsuarioCreador)
            .Include(item => item.Valoraciones)
                .ThenInclude(valoracion => valoracion.Usuario)
            .FirstOrDefaultAsync(item => item.CinePeliculaId == peliculaId);

        if (pelicula is null)
        {
            return (false, "Pel·lícula no trobada.", null);
        }

        if (pelicula.CreatedAt.Add(VotingWindow) <= now)
        {
            return (false, "Aquesta pel·lícula ja no es pot valorar.", null);
        }

        if (pelicula.Valoraciones.Any(valoracion => valoracion.UsuarioId == usuarioId))
        {
            return (false, "Ja has valorat aquesta pel·lícula.", null);
        }

        var observacion = string.IsNullOrWhiteSpace(dto.Observacion) ? null : dto.Observacion.Trim();
        var valoracion = new CineValoracion
        {
            CinePeliculaId = peliculaId,
            UsuarioId = usuarioId,
            Nota = dto.Nota!.Value,
            Observacion = observacion
        };

        _context.CineValoraciones.Add(valoracion);
        await _context.SaveChangesAsync();

        valoracion.Usuario = usuario;

        if (!pelicula.Valoraciones.Any(item => item.CineValoracionId == valoracion.CineValoracionId))
        {
            pelicula.Valoraciones.Add(valoracion);
        }

        return (true, null, ToDto(pelicula, usuarioId, now));
    }

    private static CinePeliculaDto ToDto(CinePelicula pelicula, int usuarioId, DateTime now)
    {
        var cierraAt = pelicula.CreatedAt.Add(VotingWindow);
        var yaValorada = pelicula.Valoraciones.Any(valoracion => valoracion.UsuarioId == usuarioId);

        return new CinePeliculaDto
        {
            CinePeliculaId = pelicula.CinePeliculaId,
            Titulo = pelicula.Titulo,
            UsuarioCreadorId = pelicula.UsuarioCreadorId,
            UsuarioCreadorNombre = pelicula.UsuarioCreador.Nombre,
            CreatedAt = pelicula.CreatedAt,
            CierraAt = cierraAt,
            PuedeValorar = cierraAt > now && !yaValorada,
            YaValoradaPorUsuario = yaValorada,
            MediaNota = pelicula.Valoraciones.Count > 0
                ? Math.Round((decimal)pelicula.Valoraciones.Average(valoracion => valoracion.Nota), 1)
                : null,
            Valoraciones = pelicula.Valoraciones
                .OrderBy(valoracion => valoracion.Usuario.Nombre)
                .Select(valoracion => new CineValoracionDto
                {
                    CineValoracionId = valoracion.CineValoracionId,
                    UsuarioId = valoracion.UsuarioId,
                    UsuarioNombre = valoracion.Usuario.Nombre,
                    Nota = valoracion.Nota,
                    Observacion = valoracion.Observacion,
                    CreatedAt = valoracion.CreatedAt
                })
                .ToList()
        };
    }
}
