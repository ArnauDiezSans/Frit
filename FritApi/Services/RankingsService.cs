using FritApi.Data;
using FritApi.Dtos;
using Microsoft.EntityFrameworkCore;

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
            .ToListAsync();

        var juegos = await context.Juegos
            .AsNoTracking()
            .OrderBy(juego => juego.Nombre)
            .ToListAsync();

        var jugadoresRegistrados = partidas
            .SelectMany(partida => partida.Jugadores.Select(jugador => new
            {
                partida.JuegoId,
                JuegoNombre = partida.Juego.Nombre,
                partida.Fecha,
                jugador.UsuarioId,
                UsuarioNombre = jugador.Usuario != null ? jugador.Usuario.Nombre : jugador.NombreMostrado,
                jugador.Posicion
            }))
            .Where(jugador => jugador.UsuarioId.HasValue)
            .Select(jugador => new RankingPlayerRow(
                jugador.JuegoId,
                jugador.JuegoNombre,
                jugador.Fecha,
                jugador.UsuarioId!.Value,
                jugador.UsuarioNombre,
                jugador.Posicion))
            .ToList();

        return new RankingsDto
        {
            Resumen = BuildResumen(partidas),
            Juegos = BuildJuegos(juegos, partidas),
            Usuarios = BuildUsuarios(jugadoresRegistrados),
            VictoriasPorJuego = BuildVictoriasPorJuego(jugadoresRegistrados),
            Periodos = BuildPeriodos(jugadoresRegistrados)
        };
    }

    private static RankingResumenDto BuildResumen(List<Models.Partida> partidas)
    {
        return new RankingResumenDto
        {
            PartidasTotales = partidas.Count,
            HorasTotales = Math.Round(partidas.Sum(partida => partida.DuracionMinutos ?? 0) / 60m, 1),
            PartidaMasLargaMinutos = partidas
                .Where(partida => partida.DuracionMinutos.HasValue)
                .Select(partida => partida.DuracionMinutos)
                .DefaultIfEmpty()
                .Max(),
            JuegosConPartidas = partidas
                .Select(partida => partida.JuegoId)
                .Distinct()
                .Count()
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
                    NumeroPartidas = partidasJuego.Count,
                    DuracionTotalMinutos = duraciones.Sum(),
                    DuracionMediaMinutos = duraciones.Count > 0
                        ? (int)Math.Round(duraciones.Average())
                        : null,
                    Pvp = juego.Pvp,
                    PrecioPorPartida = juego.Pvp.HasValue && partidasJuego.Count > 0
                        ? Math.Round(juego.Pvp.Value / partidasJuego.Count, 2)
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

    private sealed record RankingPlayerRow(
        int JuegoId,
        string JuegoNombre,
        DateOnly Fecha,
        int UsuarioId,
        string UsuarioNombre,
        int Posicion);
}
