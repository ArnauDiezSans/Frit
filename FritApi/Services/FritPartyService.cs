using System.Text.Json;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class FritPartyService(AppDbContext db, TimeProvider clock)
{
    public DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid")).DateTime);

    public async Task<List<string>> MissingWeights() => await db.Juegos.Where(j => j.DificultadBgg == null || j.DificultadBgg <= 0).OrderBy(j => j.Nombre).Select(j => j.Nombre).ToListAsync();

    public async Task<string?> Validate(FritPartyRequest request, bool requireWeights = true)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre)) return "Cal indicar el nom de l'edició.";
        if (request.Inicio == default || request.Fin == default || request.Fin < request.Inicio) return "Revisa les dates d'inici i final.";
        if (!requireWeights) return null;
        var missing = await MissingWeights();
        return missing.Count == 0 ? null : "Cal completar el pes BGG abans d'iniciar una Fritparty: " + string.Join(", ", missing);
    }

    public async Task<FritPartyDto> Get(FritParty party)
    {
        if (party.Snapshot != null)
            return new(party.FritPartyId, party.Nombre, party.Inicio, party.Fin, party.FrozenAt, JsonSerializer.Deserialize<List<FritPartyPlayer>>(party.Snapshot)!, []);
        var (players, errors) = await Calculate(party);
        return new(party.FritPartyId, party.Nombre, party.Inicio, party.Fin, party.FrozenAt, players, errors);
    }

    private async Task<(List<FritPartyPlayer>, List<string>)> Calculate(FritParty party)
    {
        // Explicit tenant scope also allows the background closer to process every tenant.
        var games = await db.Partidas.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.TenantId == party.TenantId && p.Fecha >= party.Inicio && p.Fecha <= party.Fin)
            .Include(p => p.Juego).Include(p => p.Jugadores).ThenInclude(p => p.Usuario).ToListAsync();
        var errors = games.Where(p => p.Juego.DificultadBgg is null or <= 0).Select(p => "Falta el pes BGG: " + p.Juego.Nombre).Distinct().ToList();
        return (BuildRanking(games), errors);
    }

    internal static decimal Multiplier(Partida game, PartidaJugador player)
    {
        if (game.Juego.EsCooperativo)
            return player.Posicion == 1 ? 1m : 0.5m;
        if (game.NumeroJugadores == 1)
            return player.Posicion == 1 ? 1.5m : 0.5m;
        var beaten = game.Juego.EsPorEquipos || game.Jugadores.Any(p => p.Equipo.HasValue)
            ? game.Jugadores.Where(p => p.Posicion > player.Posicion).Select(p => p.Equipo ?? p.Posicion).Distinct().Count()
            : game.Jugadores.Count(p => p.Posicion > player.Posicion);
        return Math.Min(10m, (beaten == 0 ? 0.5m : beaten) + (player.Posicion == 1 ? 1m : 0m));
    }

    internal static List<FritPartyPlayer> BuildRanking(IEnumerable<Partida> games)
    {
        var rows = games.SelectMany(game => game.Jugadores.Select(player => new
        {
            Key = player.UsuarioId.HasValue ? "u:" + player.UsuarioId : "g:" + Normalize(player.NombreMostrado),
            Nombre = player.Usuario?.Nombre ?? player.NombreMostrado.Trim(),
            game.JuegoId,
            Game = new FritPartyGame(game.PartidaId, game.Juego.Nombre, game.Fecha, player.Posicion,
                game.Juego.DificultadBgg ?? 0, Multiplier(game, player), (game.Juego.DificultadBgg ?? 0) * Multiplier(game, player))
        }));
        var ranked = rows.GroupBy(r => r.Key).Select(group =>
        {
            var best = group.GroupBy(r => r.JuegoId)
                .Select(game => game.OrderByDescending(r => r.Game.Puntos).ThenBy(r => r.Game.Fecha).ThenBy(r => r.Game.PartidaId).First())
                .OrderByDescending(r => r.Game.Puntos).ThenBy(r => r.Game.Fecha).ThenBy(r => r.Game.PartidaId)
                .Take(10).Select(r => r.Game).ToList();
            return new FritPartyPlayer(group.Key, group.First().Nombre, 0, best.Sum(r => r.Puntos), group.Count(), best);
        }).OrderByDescending(p => p.Puntos).ThenBy(p => p.Nombre).ToList();
        return ranked.Select(p => p with { Posicion = ranked.FindIndex(r => r.Puntos == p.Puntos) + 1 }).ToList();
    }

    private static string Normalize(string value) => string.Join(" ", value.Trim().ToUpperInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries));

    public async Task FreezeDue()
    {
        var today = Today;
        var due = await db.FritPartys.IgnoreQueryFilters().AsNoTracking().Where(p => p.Fin < today && p.Snapshot == null).ToListAsync();
        foreach (var party in due)
        {
            await using var transaction = await db.Database.BeginTransactionAsync();
            // Serialize closers and edition edits, and recheck dates after acquiring the lock.
            var current = await db.FritPartys.FromSqlInterpolated($"SELECT * FROM \"FritPartys\" WHERE \"FritPartyId\" = {party.FritPartyId} FOR UPDATE")
                .IgnoreQueryFilters().AsNoTracking().SingleOrDefaultAsync();
            if (current == null || current.Snapshot != null || current.Fin >= Today) continue;
            var (players, errors) = await Calculate(current);
            if (errors.Count > 0) continue;
            var snapshot = JsonSerializer.Serialize(players);
            var now = clock.GetUtcNow().UtcDateTime;
            // Only the first closer persists a snapshot; subsequent reads never recalculate it.
            await db.FritPartys.IgnoreQueryFilters().Where(p => p.FritPartyId == party.FritPartyId && p.Snapshot == null)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.Snapshot, snapshot).SetProperty(p => p.FrozenAt, now));
            await transaction.CommitAsync();
        }
    }
}
