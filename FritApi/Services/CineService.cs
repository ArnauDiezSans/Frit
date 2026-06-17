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

        if (!dto.Fecha.HasValue)
        {
            return (false, "La data és obligatòria.", null);
        }

        var pelicula = new CinePelicula
        {
            Titulo = titulo,
            UsuarioCreadorId = usuarioId,
            GrupoPelicula = dto.GrupoPelicula,
            CreatedAt = dto.Fecha.Value.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc)
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

        if (!dto.Nota.HasValue)
        {
            return (false, "La nota és obligatòria.", null);
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

        var existing = pelicula.Valoraciones.FirstOrDefault(valoracion => valoracion.UsuarioId == usuarioId);

        if (existing?.Nota.HasValue == true)
        {
            return (false, "Ja has valorat aquesta pel·lícula.", null);
        }

        var observacion = string.IsNullOrWhiteSpace(dto.Observacion) ? null : dto.Observacion.Trim();
        if (existing is not null)
        {
            existing.Nota = dto.Nota.Value;
            existing.Observacion = observacion;
            await _context.SaveChangesAsync();

            return (true, null, ToDto(pelicula, usuarioId, now));
        }

        var valoracion = new CineValoracion
        {
            CinePeliculaId = peliculaId,
            UsuarioId = usuarioId,
            Nota = dto.Nota.Value,
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

    public async Task<(bool Success, string? Error, CinePeliculaDto? Pelicula)> MarcarAsistenciaAsync(
        int peliculaId,
        int currentUsuarioId,
        CineAsistenciaCreateDto dto)
    {
        var currentUsuario = await _context.Usuarios.FirstOrDefaultAsync(usuario => usuario.UsuarioId == currentUsuarioId);

        if (currentUsuario is null)
        {
            return (false, "Usuari no trobat.", null);
        }

        if (ExternalUserPolicy.IsExternal(currentUsuario))
        {
            return (false, "L'usuari Extern no pot marcar assistències.", null);
        }

        if (!dto.UsuarioId.HasValue)
        {
            return (false, "L'usuari és obligatori.", null);
        }

        var usuario = await _context.Usuarios.FirstOrDefaultAsync(item => item.UsuarioId == dto.UsuarioId.Value);

        if (usuario is null || ExternalUserPolicy.IsExternal(usuario))
        {
            return (false, "Usuari no trobat.", null);
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

        if (pelicula.Valoraciones.Any(valoracion => valoracion.UsuarioId == usuario.UsuarioId))
        {
            return (false, "Aquest usuari ja consta com a assistent.", null);
        }

        var asistencia = new CineValoracion
        {
            CinePeliculaId = peliculaId,
            UsuarioId = usuario.UsuarioId,
            Nota = null
        };

        _context.CineValoraciones.Add(asistencia);
        await _context.SaveChangesAsync();

        asistencia.Usuario = usuario;
        if (!pelicula.Valoraciones.Any(item => item.CineValoracionId == asistencia.CineValoracionId))
        {
            pelicula.Valoraciones.Add(asistencia);
        }

        return (true, null, ToDto(pelicula, currentUsuarioId, DateTime.UtcNow));
    }

    private static CinePeliculaDto ToDto(CinePelicula pelicula, int usuarioId, DateTime now)
    {
        var cierraAt = pelicula.CreatedAt.Add(VotingWindow);
        var yaValorada = pelicula.Valoraciones.Any(valoracion =>
            valoracion.UsuarioId == usuarioId && valoracion.Nota.HasValue);
        var yaAsistida = pelicula.Valoraciones.Any(valoracion => valoracion.UsuarioId == usuarioId);
        var notas = pelicula.Valoraciones
            .Where(valoracion => valoracion.Nota.HasValue)
            .Select(valoracion => valoracion.Nota!.Value)
            .ToList();

        return new CinePeliculaDto
        {
            CinePeliculaId = pelicula.CinePeliculaId,
            Titulo = pelicula.Titulo,
            UsuarioCreadorId = pelicula.UsuarioCreadorId,
            UsuarioCreadorNombre = pelicula.UsuarioCreador.Nombre,
            CreatedAt = pelicula.CreatedAt,
            GrupoPelicula = pelicula.GrupoPelicula,
            CierraAt = cierraAt,
            PuedeValorar = cierraAt > now && !yaValorada,
            YaValoradaPorUsuario = yaValorada,
            YaAsistidaPorUsuario = yaAsistida,
            MediaNota = notas.Count > 0
                ? Math.Round(notas.Average(), 1)
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
