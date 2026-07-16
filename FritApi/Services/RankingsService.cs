using FritApi.Data;
using FritApi.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

namespace FritApi.Services;

public class RankingsService
{
    private readonly AppDbContext context;

    public RankingsService(AppDbContext context)
    {
        this.context = context;
    }

    public async Task<RankingsDto> GetAsync()
    {
        var partidas = await context.Partidas
            .AsNoTracking()
            .Include(partida => partida.Juego)
            .Include(partida => partida.Jugadores)
                .ThenInclude(jugador => jugador.Usuario)
            .AsSplitQuery()
            .ToListAsync();

        var juegos = await context.Juegos
            .AsNoTracking()
            .OrderBy(juego => juego.Nombre)
            .ToListAsync();

        var usuariosRegistrados = await context.Usuarios
            .AsNoTracking()
            .Where(usuario =>
                !usuario.EsUsuarioExterno)
            .Select(usuario => new RegisteredUserRow(
                usuario.UsuarioId,
                usuario.Nombre,
                NormalizeName(usuario.Nombre)))
            .ToListAsync();

        var jugadoresRegistrados = BuildRankingPlayerRows(partidas, usuariosRegistrados);

        return new RankingsDto
        {
            Resumen = BuildResumen(partidas),
            Juegos = BuildJuegos(juegos, partidas),
            Usuarios = BuildUsuarios(jugadoresRegistrados),
            VictoriasPorJuego = BuildVictoriasPorJuego(jugadoresRegistrados),
            Periodos = BuildPeriodos(jugadoresRegistrados),
            Partidas = BuildPartidas(partidas),
            Jugadores = BuildJugadores(jugadoresRegistrados)
        };
    }

    private static RankingResumenDto BuildResumen(List<Models.Partida> partidas)
    {
        var partidaMasLarga = partidas
            .Where(partida => partida.DuracionMinutos.HasValue)
            .OrderByDescending(partida => partida.DuracionMinutos)
            .ThenByDescending(partida => partida.Fecha)
            .FirstOrDefault();

        var juegoMasJugado = partidas
            .GroupBy(partida => new { partida.JuegoId, partida.Juego.Nombre })
            .Select(group => new
            {
                group.Key.JuegoId,
                group.Key.Nombre,
                Partidas = group.Count()
            })
            .OrderByDescending(row => row.Partidas)
            .ThenBy(row => row.Nombre)
            .FirstOrDefault();

        return new RankingResumenDto
        {
            PartidasTotales = partidas.Count,
            HorasTotales = Math.Round(partidas.Sum(partida => partida.DuracionMinutos ?? 0) / 60m, 1),
            PartidaMasLargaMinutos = partidaMasLarga?.DuracionMinutos,
            PartidaMasLargaJuegoNombre = partidaMasLarga?.Juego.Nombre,
            JuegoMasJugadoId = juegoMasJugado?.JuegoId,
            JuegoMasJugadoNombre = juegoMasJugado?.Nombre,
            JuegoMasJugadoPartidas = juegoMasJugado?.Partidas ?? 0
        };
    }

    private static List<RankingJuegoDto> BuildJuegos(
        List<Models.Juego> juegos,
        List<Models.Partida> partidas)
    {
        return juegos
            .Select(juego =>
            {
                var partidasJuego = partidas
                    .Where(partida => partida.JuegoId == juego.JuegoId)
                    .ToList();
                var duraciones = partidasJuego
                    .Where(partida => partida.DuracionMinutos.HasValue)
                    .Select(partida => partida.DuracionMinutos!.Value)
                    .ToList();

                return new RankingJuegoDto
                {
                    JuegoId = juego.JuegoId,
                    Nombre = juego.Nombre,
                    Tipo = juego.Tipo,
                    NumeroJugadoresMin = juego.NumeroJugadoresMin,
                    NumeroJugadoresMax = juego.NumeroJugadoresMax,
                    NumeroPartidas = partidasJuego.Count,
                    DuracionTotalMinutos = duraciones.Sum(),
                    DuracionMediaMinutos = duraciones.Count > 0
                        ? (int)Math.Round(duraciones.Average())
                        : null,
                    Pvp = juego.Pvp,
                    PrecioPorPartida = juego.Pvp.HasValue && partidasJuego.Count > 0
                        ? Math.Round(juego.Pvp.Value / partidasJuego.Count, 2)
                        : null,
                    PrecioPorJugadorPartida = juego.Pvp.HasValue && partidasJuego.Sum(partida => partida.NumeroJugadores) > 0
                        ? Math.Round(juego.Pvp.Value / partidasJuego.Sum(partida => partida.NumeroJugadores), 2)
                        : null,
                    UltimaPartida = partidasJuego
                        .OrderByDescending(partida => partida.Fecha)
                        .Select(partida => (DateOnly?)partida.Fecha)
                        .FirstOrDefault()
                };
            })
            .OrderByDescending(juego => juego.NumeroPartidas)
            .ThenBy(juego => juego.Nombre)
            .ToList();
    }

    private static List<RankingUsuarioDto> BuildUsuarios(IEnumerable<RankingPlayerRow> jugadores)
    {
        return jugadores
            .GroupBy(jugador => new { jugador.UsuarioId, jugador.UsuarioNombre })
            .Select(group =>
            {
                var partidasTotales = group.Count();
                var victorias = group.Count(jugador => jugador.Posicion == 1);

                return new RankingUsuarioDto
                {
                    UsuarioId = group.Key.UsuarioId,
                    UsuarioNombre = group.Key.UsuarioNombre,
                    PartidasTotales = partidasTotales,
                    Victorias = victorias,
                    PorcentajeVictoria = CalculatePercentage(victorias, partidasTotales)
                };
            })
            .OrderByDescending(usuario => usuario.Victorias)
            .ThenByDescending(usuario => usuario.PorcentajeVictoria)
            .ThenBy(usuario => usuario.UsuarioNombre)
            .ToList();
    }

    private static List<RankingVictoriaJuegoDto> BuildVictoriasPorJuego(IEnumerable<RankingPlayerRow> jugadores)
    {
        return jugadores
            .GroupBy(jugador => new
            {
                jugador.JuegoId,
                jugador.JuegoNombre,
                jugador.UsuarioId,
                jugador.UsuarioNombre
            })
            .Select(group =>
            {
                var partidasTotales = group.Count();
                var victorias = group.Count(jugador => jugador.Posicion == 1);

                return new RankingVictoriaJuegoDto
                {
                    JuegoId = group.Key.JuegoId,
                    JuegoNombre = group.Key.JuegoNombre,
                    UsuarioId = group.Key.UsuarioId,
                    UsuarioNombre = group.Key.UsuarioNombre,
                    PartidasTotales = partidasTotales,
                    Victorias = victorias,
                    PorcentajeVictoria = CalculatePercentage(victorias, partidasTotales)
                };
            })
            .Where(row => row.PartidasTotales > 0)
            .OrderByDescending(row => row.Victorias)
            .ThenByDescending(row => row.PorcentajeVictoria)
            .ThenBy(row => row.JuegoNombre)
            .ThenBy(row => row.UsuarioNombre)
            .Take(30)
            .ToList();
    }

    private static List<RankingPeriodoDto> BuildPeriodos(IEnumerable<RankingPlayerRow> jugadores)
    {
        return jugadores
            .GroupBy(jugador => new
            {
                Periodo = $"{jugador.Fecha.Year:D4}-{jugador.Fecha.Month:D2}",
                jugador.UsuarioId,
                jugador.UsuarioNombre
            })
            .Select(group =>
            {
                var partidasTotales = group.Count();
                var victorias = group.Count(jugador => jugador.Posicion == 1);

                return new RankingPeriodoDto
                {
                    Periodo = group.Key.Periodo,
                    UsuarioId = group.Key.UsuarioId,
                    UsuarioNombre = group.Key.UsuarioNombre,
                    PartidasTotales = partidasTotales,
                    Victorias = victorias,
                    PorcentajeVictoria = CalculatePercentage(victorias, partidasTotales)
                };
            })
            .OrderByDescending(row => row.Periodo)
            .ThenByDescending(row => row.PorcentajeVictoria)
            .ThenByDescending(row => row.Victorias)
            .Take(36)
            .ToList();
    }

    private static decimal CalculatePercentage(int numerator, int denominator)
    {
        if (denominator == 0)
        {
            return 0;
        }

        return Math.Round(numerator * 100m / denominator, 1);
    }

    private static List<RankingPlayerRow> BuildRankingPlayerRows(
        List<Models.Partida> partidas,
        List<RegisteredUserRow> usuariosRegistrados)
    {
        var usuariosById = usuariosRegistrados.ToDictionary(usuario => usuario.UsuarioId);
        var result = new List<RankingPlayerRow>();

        foreach (var partida in partidas)
        {
            foreach (var jugador in partida.Jugadores)
            {
                var jugadoresDetectados = new Dictionary<int, RegisteredUserRow>();

                if (jugador.UsuarioId.HasValue &&
                    usuariosById.TryGetValue(jugador.UsuarioId.Value, out var usuario))
                {
                    jugadoresDetectados[usuario.UsuarioId] = usuario;
                }

                foreach (var usuarioDetectado in MatchUsuariosByNombreMostrado(
                    jugador.NombreMostrado,
                    usuariosRegistrados))
                {
                    jugadoresDetectados.TryAdd(usuarioDetectado.UsuarioId, usuarioDetectado);
                }

                foreach (var usuarioDetectado in jugadoresDetectados.Values)
                {
                    result.Add(new RankingPlayerRow(
                        partida.PartidaId,
                        partida.JuegoId,
                        partida.Juego.Nombre,
                        partida.Juego.Tipo,
                        partida.Fecha,
                        partida.DuracionMinutos,
                        partida.NumeroJugadores,
                        partida.Juego.DificultadBgg,
                        usuarioDetectado.UsuarioId,
                        usuarioDetectado.Nombre,
                        jugador.Posicion,
                        jugador.Puntos));
                }
            }
        }

        return result;
    }

    private static IEnumerable<RegisteredUserRow> MatchUsuariosByNombreMostrado(
        string nombreMostrado,
        List<RegisteredUserRow> usuariosRegistrados)
    {
        var nombres = SplitDisplayedNames(nombreMostrado);

        if (nombres.Count == 0)
        {
            return [];
        }

        return usuariosRegistrados.Where(usuario => nombres.Contains(usuario.NormalizedNombre));
    }

    private static HashSet<string> SplitDisplayedNames(string value)
    {
        var normalized = NormalizeName(value);

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return [];
        }

        normalized = normalized
            .Replace(" i ", ", ", StringComparison.Ordinal)
            .Replace(" y ", ", ", StringComparison.Ordinal)
            .Replace(" and ", ", ", StringComparison.Ordinal)
            .Replace(" amb ", ", ", StringComparison.Ordinal)
            .Replace(" con ", ", ", StringComparison.Ordinal);

        return normalized
            .Split([',', ';', '/', '+', '&'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .ToHashSet();
    }

    private static string NormalizeName(string value)
    {
        var normalized = value.Trim().Normalize(NormalizationForm.FormD);
        var chars = normalized
            .Where(character => CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            .Select(char.ToLowerInvariant)
            .ToArray();

        return string.Join(
            ' ',
            new string(chars)
                .Normalize(NormalizationForm.FormC)
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
    }

    private static List<RankingPartidaDto> BuildPartidas(List<Models.Partida> partidas)
    {
        return partidas
            .Select(partida => new RankingPartidaDto
            {
                PartidaId = partida.PartidaId,
                JuegoId = partida.JuegoId,
                JuegoNombre = partida.Juego.Nombre,
                JuegoTipo = partida.Juego.Tipo,
                Fecha = partida.Fecha,
                NumeroJugadores = partida.NumeroJugadores,
                DuracionMinutos = partida.DuracionMinutos
            })
            .OrderByDescending(partida => partida.Fecha)
            .ThenBy(partida => partida.JuegoNombre)
            .ToList();
    }

    private static List<RankingJugadorDto> BuildJugadores(IEnumerable<RankingPlayerRow> jugadores)
    {
        return jugadores
            .Select(jugador => new RankingJugadorDto
            {
                PartidaId = jugador.PartidaId,
                JuegoId = jugador.JuegoId,
                JuegoNombre = jugador.JuegoNombre,
                JuegoTipo = jugador.JuegoTipo,
                Fecha = jugador.Fecha,
                DuracionMinutos = jugador.DuracionMinutos,
                NumeroJugadores = jugador.NumeroJugadores,
                DificultadBgg = jugador.DificultadBgg,
                UsuarioId = jugador.UsuarioId,
                UsuarioNombre = jugador.UsuarioNombre,
                Posicion = jugador.Posicion,
                Puntos = jugador.Puntos
            })
            .OrderBy(jugador => jugador.JuegoNombre)
            .ThenBy(jugador => jugador.UsuarioNombre)
            .ToList();
    }

    private sealed record RankingPlayerRow(
        int PartidaId,
        int JuegoId,
        string JuegoNombre,
        string JuegoTipo,
        DateOnly Fecha,
        int? DuracionMinutos,
        int NumeroJugadores,
        decimal? DificultadBgg,
        int UsuarioId,
        string UsuarioNombre,
        int Posicion,
        decimal? Puntos);

    private sealed record RegisteredUserRow(
        int UsuarioId,
        string Nombre,
        string NormalizedNombre);
}
