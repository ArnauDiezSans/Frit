using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class AQueJuguemService
{
    private readonly AppDbContext _context;
    private readonly UsuarioJuegoOrdenService _usuarioJuegoOrdenService;

    public AQueJuguemService(
        AppDbContext context,
        UsuarioJuegoOrdenService usuarioJuegoOrdenService)
    {
        _context = context;
        _usuarioJuegoOrdenService = usuarioJuegoOrdenService;
    }

    public async Task<(bool Success, string? Error, List<AQueJuguemRecommendationDto> Juegos)> GetRecommendationsAsync(
        AQueJuguemRequestDto dto)
    {
        var usuarioIds = dto.UsuarioIds.Distinct().ToList();

        if (usuarioIds.Count != dto.UsuarioIds.Count || usuarioIds.Count != dto.NumeroJugadores)
        {
            return (false, "Has d'indicar un usuari diferent per a cada jugador.", []);
        }

        var existingUsersCount = await _context.Usuarios
            .CountAsync(usuario =>
                usuarioIds.Contains(usuario.UsuarioId) &&
                usuario.UsuarioId != ExternalUserPolicy.ExternalUserId &&
                usuario.Nombre != ExternalUserPolicy.ExternalUserName);

        if (existingUsersCount != usuarioIds.Count)
        {
            return (false, "Algun dels usuaris indicats no existeix o no pot jugar.", []);
        }

        foreach (var usuarioId in usuarioIds)
        {
            await _usuarioJuegoOrdenService.EnsureOrdenCompletoAsync(usuarioId);
        }

        var juegos = await _context.Juegos
            .Where(juego =>
                juego.NumeroJugadoresMin <= dto.NumeroJugadores &&
                juego.NumeroJugadoresMax >= dto.NumeroJugadores)
            .Select(juego => new
            {
                juego.JuegoId,
                juego.Nombre,
                juego.NumeroJugadoresMin,
                juego.NumeroJugadoresMax
            })
            .ToListAsync();

        var juegoIds = juegos.Select(juego => juego.JuegoId).ToList();

        var puntuaciones = await _context.UsuarioJuegoOrdenes
            .Where(orden => usuarioIds.Contains(orden.UsuarioId) && juegoIds.Contains(orden.JuegoId))
            .GroupBy(orden => orden.JuegoId)
            .Select(group => new
            {
                JuegoId = group.Key,
                Puntuacion = group.Sum(orden => orden.Puntuacion)
            })
            .ToDictionaryAsync(item => item.JuegoId, item => item.Puntuacion);

        var result = juegos
            .Select(juego => new AQueJuguemRecommendationDto
            {
                JuegoId = juego.JuegoId,
                Nombre = juego.Nombre,
                NumeroJugadoresMin = juego.NumeroJugadoresMin,
                NumeroJugadoresMax = juego.NumeroJugadoresMax,
                Puntuacion = puntuaciones.GetValueOrDefault(juego.JuegoId)
            })
            .OrderByDescending(juego => juego.Puntuacion)
            .ThenBy(juego => juego.Nombre)
            .ToList();

        return (true, null, result);
    }

    public async Task<(bool Success, string? Error)> RegisterRemadaAsync(
        int usuarioCreadorId,
        RemadaCreateDto dto)
    {
        var expectedPoints = dto.NombreJocs switch
        {
            1 => 3,
            5 => 2,
            10 => 1,
            _ => 0
        };

        if (expectedPoints == 0 || dto.PuntsPerJugador != expectedPoints)
        {
            return (false, "La intensitat de la remada no és vàlida.");
        }

        var usuarioIds = dto.UsuarioIds.Distinct().ToList();
        var juegoIds = dto.JuegoIds.Distinct().ToList();

        if (usuarioIds.Count == 0 || usuarioIds.Count != dto.UsuarioIds.Count)
        {
            return (false, "Els jugadors de la remada no són vàlids.");
        }

        if (juegoIds.Count != dto.NombreJocs || juegoIds.Count != dto.JuegoIds.Count)
        {
            return (false, "Els jocs de la remada no coincideixen amb la intensitat.");
        }

        var usuarios = await _context.Usuarios
            .Where(usuario =>
                usuarioIds.Contains(usuario.UsuarioId) &&
                usuario.UsuarioId != ExternalUserPolicy.ExternalUserId &&
                usuario.Nombre != ExternalUserPolicy.ExternalUserName)
            .ToListAsync();

        if (usuarios.Count != usuarioIds.Count)
        {
            return (false, "Algun jugador no existeix o no pot participar.");
        }

        var juegos = await _context.Juegos
            .Where(juego => juegoIds.Contains(juego.JuegoId))
            .ToListAsync();

        if (juegos.Count != juegoIds.Count)
        {
            return (false, "Algun joc de la remada no existeix.");
        }

        var usuariosById = usuarios.ToDictionary(usuario => usuario.UsuarioId);
        var juegosById = juegos.ToDictionary(juego => juego.JuegoId);
        var remada = new Remada
        {
            UsuarioCreadorId = usuarioCreadorId,
            TempsDisponibleMinuts = dto.TempsDisponibleMinuts,
            NombreJocs = dto.NombreJocs,
            PuntsPerJugador = dto.PuntsPerJugador,
            Jugadors = usuarioIds.Select(usuarioId => new RemadaJugador
            {
                UsuarioId = usuarioId,
                UsuarioNombre = usuariosById[usuarioId].Nombre,
                Punts = dto.PuntsPerJugador
            }).ToList(),
            Jocs = juegoIds.Select((juegoId, index) => new RemadaJuego
            {
                JuegoId = juegoId,
                JuegoNombre = juegosById[juegoId].Nombre,
                Posicion = index + 1
            }).ToList()
        };

        _context.Remades.Add(remada);
        await _context.SaveChangesAsync();

        return (true, null);
    }

    public async Task<List<RemadaDto>> GetRemadesAsync()
    {
        return await _context.Remades
            .AsNoTracking()
            .Include(remada => remada.Jugadors)
            .Include(remada => remada.Jocs)
            .OrderByDescending(remada => remada.CreatedAt)
            .Select(remada => new RemadaDto
            {
                RemadaId = remada.RemadaId,
                CreatedAt = remada.CreatedAt,
                TempsDisponibleMinuts = remada.TempsDisponibleMinuts,
                NombreJocs = remada.NombreJocs,
                PuntsPerJugador = remada.PuntsPerJugador,
                Jugadors = remada.Jugadors
                    .OrderBy(jugador => jugador.UsuarioNombre)
                    .Select(jugador => new RemadaParticipantDto
                    {
                        UsuarioId = jugador.UsuarioId,
                        Nombre = jugador.UsuarioNombre,
                        Punts = jugador.Punts
                    })
                    .ToList(),
                Jocs = remada.Jocs
                    .OrderBy(joc => joc.Posicion)
                    .Select(joc => new RemadaGameDto
                    {
                        JuegoId = joc.JuegoId,
                        Nombre = joc.JuegoNombre,
                        Posicion = joc.Posicion
                    })
                    .ToList()
            })
            .ToListAsync();
    }

    public async Task<(bool Success, string? Error)> UpdateRemadaAsync(
        int remadaId,
        RemadaUpdateDto dto)
    {
        var validation = await ValidateRemadaDataAsync(
            dto.NombreJocs,
            dto.PuntsPerJugador,
            dto.UsuarioIds,
            dto.JuegoIds);

        if (!validation.Success)
        {
            return (false, validation.Error);
        }

        var remada = await _context.Remades
            .Include(row => row.Jugadors)
            .Include(row => row.Jocs)
            .FirstOrDefaultAsync(row => row.RemadaId == remadaId);

        if (remada is null)
        {
            return (false, "Remada no trobada.");
        }

        remada.CreatedAt = dto.CreatedAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dto.CreatedAt, DateTimeKind.Utc)
            : dto.CreatedAt.ToUniversalTime();
        remada.TempsDisponibleMinuts = dto.TempsDisponibleMinuts;
        remada.NombreJocs = dto.NombreJocs;
        remada.PuntsPerJugador = dto.PuntsPerJugador;

        _context.RemadaJugadors.RemoveRange(remada.Jugadors);
        _context.RemadaJocs.RemoveRange(remada.Jocs);
        remada.Jugadors = validation.UsuarioIds.Select(usuarioId => new RemadaJugador
        {
            UsuarioId = usuarioId,
            UsuarioNombre = validation.UsuariosById[usuarioId].Nombre,
            Punts = dto.PuntsPerJugador
        }).ToList();
        remada.Jocs = validation.JuegoIds.Select((juegoId, index) => new RemadaJuego
        {
            JuegoId = juegoId,
            JuegoNombre = validation.JuegosById[juegoId].Nombre,
            Posicion = index + 1
        }).ToList();

        await _context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<bool> DeleteRemadaAsync(int remadaId)
    {
        var remada = await _context.Remades.FindAsync(remadaId);
        if (remada is null)
        {
            return false;
        }

        _context.Remades.Remove(remada);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<(
        bool Success,
        string? Error,
        List<int> UsuarioIds,
        List<int> JuegoIds,
        Dictionary<int, Usuario> UsuariosById,
        Dictionary<int, Juego> JuegosById)> ValidateRemadaDataAsync(
        int nombreJocs,
        int puntsPerJugador,
        List<int> rawUsuarioIds,
        List<int> rawJuegoIds)
    {
        var expectedPoints = nombreJocs switch
        {
            1 => 3,
            5 => 2,
            10 => 1,
            _ => 0
        };
        var usuarioIds = rawUsuarioIds.Distinct().ToList();
        var juegoIds = rawJuegoIds.Distinct().ToList();

        if (expectedPoints == 0 || puntsPerJugador != expectedPoints)
        {
            return (false, "La intensitat de la remada no és vàlida.", [], [], [], []);
        }

        if (usuarioIds.Count == 0 || usuarioIds.Count != rawUsuarioIds.Count)
        {
            return (false, "Els jugadors de la remada no són vàlids.", [], [], [], []);
        }

        if (juegoIds.Count != nombreJocs || juegoIds.Count != rawJuegoIds.Count)
        {
            return (false, "Els jocs de la remada no coincideixen amb la intensitat.", [], [], [], []);
        }

        var usuarios = await _context.Usuarios
            .Where(usuario =>
                usuarioIds.Contains(usuario.UsuarioId) &&
                usuario.UsuarioId != ExternalUserPolicy.ExternalUserId &&
                usuario.Nombre != ExternalUserPolicy.ExternalUserName)
            .ToDictionaryAsync(usuario => usuario.UsuarioId);
        var juegos = await _context.Juegos
            .Where(juego => juegoIds.Contains(juego.JuegoId))
            .ToDictionaryAsync(juego => juego.JuegoId);

        if (usuarios.Count != usuarioIds.Count)
        {
            return (false, "Algun jugador no existeix o no pot participar.", [], [], [], []);
        }

        if (juegos.Count != juegoIds.Count)
        {
            return (false, "Algun joc de la remada no existeix.", [], [], [], []);
        }

        return (true, null, usuarioIds, juegoIds, usuarios, juegos);
    }
}
