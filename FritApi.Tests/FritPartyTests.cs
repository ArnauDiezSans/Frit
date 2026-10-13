using System.Text.Json;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;
using FritApi.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace FritApi.Tests;

public class FritPartyTests
{
    private static Partida Game(params int[] positions) => new()
    {
        Juego = new Juego { Nombre = "Test", DificultadBgg = 3.45m }, NumeroJugadores = positions.Length,
        Fecha = new DateOnly(2026, 10, 13),
        Jugadores = positions.Select((position, i) => new PartidaJugador { UsuarioId = i + 1, NombreMostrado = "Player " + i, Posicion = position }).ToList()
    };

    [Fact]
    public void IndividualTiesCountOnlyStrictlyBeatenRivals()
    {
        var game = Game(1, 2, 2, 4);
        Assert.Equal(new decimal[] { 4, 1, 1, 0.5m }, game.Jugadores.Select(p => FritPartyService.Multiplier(game, p)));
    }

    [Fact]
    public void FirstPlaceTiesAllGetWinBonus()
    {
        var game = Game(1, 1, 3, 4);
        Assert.Equal(new decimal[] { 3, 3, 1, 0.5m }, game.Jugadores.Select(p => FritPartyService.Multiplier(game, p)));
        game = Game(1, 1, 1);
        Assert.All(game.Jugadores, p => Assert.Equal(1.5m, FritPartyService.Multiplier(game, p)));
    }

    [Theory]
    [InlineData(true, 3, 1, 1)]
    [InlineData(true, 3, 2, 0.5)]
    [InlineData(false, 1, 1, 1.5)]
    [InlineData(false, 1, 2, 0.5)]
    public void CooperativeAndSoloDependOnVictory(bool cooperative, int count, int position, double expected)
    {
        var game = Game(Enumerable.Repeat(position, count).ToArray()); game.Juego.EsCooperativo = cooperative;
        Assert.Equal((decimal)expected, FritPartyService.Multiplier(game, game.Jugadores.First()));
    }

    [Fact]
    public void TeamsCountTeamsRatherThanMembersIncludingTiedTeams()
    {
        var game = Game(1, 1, 3, 3, 3, 3);
        game.Juego.EsPorEquipos = true;
        var players = game.Jugadores.ToArray();
        for (var i = 0; i < players.Length; i++) players[i].Equipo = i / 2 + 1;
        Assert.Equal(3m, FritPartyService.Multiplier(game, players[0]));
        Assert.Equal(0.5m, FritPartyService.Multiplier(game, players[2]));
        game.Juego.EsPorEquipos = false;
        Assert.Equal(3m, FritPartyService.Multiplier(game, players[0]));
    }

    [Fact]
    public void HistoricalTeamsFallBackToSharedPosition()
    {
        var game = Game(1, 1, 4, 4); game.Juego.EsPorEquipos = true;
        Assert.Equal(2m, FritPartyService.Multiplier(game, game.Jugadores.First()));
        Assert.Equal(0.5m, FritPartyService.Multiplier(game, game.Jugadores.Last()));
    }

    [Fact]
    public void RankingKeepsTenBestGamesAndSharesPosition()
    {
        var games = Enumerable.Range(1, 12).Select(i =>
        {
            var game = Game(1, 1); game.PartidaId = i; game.JuegoId = i; game.Juego.DificultadBgg = i; return game;
        }).ToList();
        var ranking = FritPartyService.BuildRanking(games);
        Assert.Equal(2, ranking.Count);
        Assert.All(ranking, p =>
        {
            Assert.Equal(1, p.Posicion); Assert.Equal(12, p.PartidasTotales); Assert.Equal(10, p.Partidas.Count);
            Assert.Equal(112.5m, p.Puntos); Assert.DoesNotContain(p.Partidas, g => g.PartidaId <= 2);
        });
    }

    [Fact]
    public void GuestsAreIncludedAndNamesAreNormalizedAcrossGames()
    {
        var first = Game(1, 2); var second = Game(1, 2);
        first.Jugadores.First().UsuarioId = null; first.Jugadores.First().NombreMostrado = "  Visitant  ";
        second.Jugadores.First().UsuarioId = null; second.Jugadores.First().NombreMostrado = "visitant";
        var ranking = FritPartyService.BuildRanking([first, second]);
        Assert.Equal(2, ranking.Count);
        Assert.Equal(2, ranking.Single(p => p.Key.StartsWith("g:")).PartidasTotales);
    }

    [Fact]
    public void OnlyBestScorePerGameCountsIndependentlyForEachPlayer()
    {
        var first = Game(1, 2); first.PartidaId = 1; first.JuegoId = 10;
        var second = Game(2, 1); second.PartidaId = 2; second.JuegoId = 10;
        var other = Game(1, 2); other.PartidaId = 3; other.JuegoId = 20;
        var ranking = FritPartyService.BuildRanking([first, second, other]);
        Assert.All(ranking, p => { Assert.Equal(3, p.PartidasTotales); Assert.Equal(2, p.Partidas.Count); });
        Assert.Equal(new[] { 1, 3 }, ranking.Single(p => p.Key == "u:1").Partidas.Select(p => p.PartidaId));
        Assert.Equal(new[] { 2, 3 }, ranking.Single(p => p.Key == "u:2").Partidas.Select(p => p.PartidaId));
        Assert.Equal(13.8m, ranking.Single(p => p.Key == "u:1").Puntos);
        Assert.Equal(8.625m, ranking.Single(p => p.Key == "u:2").Puntos);
    }

    [Theory]
    [InlineData(10)]
    [InlineData(11)]
    [InlineData(20)]
    public void IndividualMultipliersNeverExceedTen(int count)
    {
        var game = Game(Enumerable.Range(1, count).ToArray());
        Assert.Equal(10m, FritPartyService.Multiplier(game, game.Jugadores.First()));
        Assert.All(game.Jugadores, p => Assert.InRange(FritPartyService.Multiplier(game, p), 0.5m, 10m));
    }

    [Fact]
    public void TwoTeamsScoreTwoForWinnersAndHalfForLosers()
    {
        var game = Game(1, 1, 1, 6, 6, 6);
        foreach (var player in game.Jugadores) player.Equipo = player.Posicion == 1 ? 1 : 2;
        Assert.All(game.Jugadores, p => Assert.Equal(p.Posicion == 1 ? 2m : 0.5m, FritPartyService.Multiplier(game, p)));
    }

    [Fact]
    public void TeamMultipliersNeverExceedTen()
    {
        var game = Game(Enumerable.Range(1, 12).SelectMany(p => new[] { p, p }).ToArray());
        foreach (var player in game.Jugadores) player.Equipo = player.Posicion;
        Assert.Equal(10m, FritPartyService.Multiplier(game, game.Jugadores.First()));
        Assert.All(game.Jugadores, p => Assert.InRange(FritPartyService.Multiplier(game, p), 0.5m, 10m));
    }

    [Fact]
    public async Task MissingWeightBlocksCreationAndDatesAreValidated()
    {
        await using var db = Context();
        db.Juegos.Add(new Juego { Nombre = "Sense pes", TenantId = 1 }); await db.SaveChangesAsync();
        var service = new FritPartyService(db, TimeProvider.System);
        Assert.Contains("Sense pes", await service.Validate(new() { Nombre = "Test", Inicio = new(2026, 10, 1), Fin = new(2026, 10, 31) }));
        Assert.Contains("dates", await service.Validate(new() { Nombre = "Test", Inicio = new(2026, 10, 31), Fin = new(2026, 10, 1) }));
    }

    [Fact]
    public async Task FrozenResultsAreReadWithoutRecalculatingChangedGames()
    {
        await using var db = Context();
        var original = FritPartyService.BuildRanking([Game(1, 2)]);
        var party = new FritParty { Nombre = "Frozen", Inicio = new(2026, 10, 1), Fin = new(2026, 10, 31), Snapshot = JsonSerializer.Serialize(original), FrozenAt = DateTime.UtcNow };
        var result = await new FritPartyService(db, TimeProvider.System).Get(party);
        Assert.Equal(original[0].Puntos, result.Jugadores[0].Puntos);
        Assert.NotNull(result.FrozenAt);
    }

    [Fact]
    public async Task EditionIncludesBothBoundaryDatesAndExcludesOtherDatesAndTenants()
    {
        await using var db = Context();
        foreach (var day in new[] { 1, 2, 3, 4 })
        {
            var game = Game(1, 2); game.Fecha = new(2026, 10, day);
            db.Partidas.Add(game);
        }
        await db.SaveChangesAsync();
        var result = await new FritPartyService(db, TimeProvider.System).Get(new FritParty { TenantId = 1, Inicio = new(2026, 10, 2), Fin = new(2026, 10, 3) });
        Assert.All(result.Jugadores, p => Assert.Equal(2, p.PartidasTotales));
        var otherTenant = await new FritPartyService(db, TimeProvider.System).Get(new FritParty { TenantId = 2, Inicio = new(2026, 10, 2), Fin = new(2026, 10, 3) });
        Assert.Empty(otherTenant.Jugadores);
    }

    [Theory]
    [InlineData("Joan")]
    [InlineData("Xumi")]
    public async Task OtherUsersCannotEditDeleteOrRecalculateEvenWhenAdmin(string name)
    {
        await using var db = Context();
        var controller = Controller(db, name);
        Assert.IsType<ForbidResult>(await controller.Update(1, new()));
        Assert.IsType<ForbidResult>(await controller.Delete(1));
        Assert.IsType<ForbidResult>(await controller.Recalculate(1));
    }

    [Fact]
    public async Task AnyUserCanCreateAndOnlyThePrimaryManagerCanRenameOrDeleteFrozenEdition()
    {
        await using var db = Context();
        var request = new FritPartyRequest { Nombre = "Fritparty prova", Inicio = new(2099, 10, 1), Fin = new(2099, 10, 31) };
        Assert.IsType<OkObjectResult>(await Controller(db, "Joan").Create(request));
        var party = await db.FritPartys.SingleAsync();
        party.Snapshot = "[]"; party.FrozenAt = DateTime.UtcNow; await db.SaveChangesAsync();
        db.Juegos.Add(new Juego { Nombre = "Sense pes" }); await db.SaveChangesAsync();
        request.Nombre = "Nom corregit";
        Assert.IsType<ForbidResult>(await Controller(db, "Arnau").Update(party.FritPartyId, request));
        Assert.IsType<NoContentResult>(await Controller(db, "Arnau", primaryManager: true).Update(party.FritPartyId, request));
        Assert.Equal("[]", party.Snapshot);
        Assert.Equal("Nom corregit", party.Nombre);
        Assert.IsType<NoContentResult>(await Controller(db, "Arnau", primaryManager: true).Delete(party.FritPartyId));
        Assert.Empty(await db.FritPartys.ToListAsync());
    }

    [Fact]
    public void EditionClosingUsesMadridCalendarDay()
    {
        using var db = Context();
        var clock = new FixedClock(DateTimeOffset.Parse("2026-10-13T22:00:00Z"));
        Assert.Equal(new DateOnly(2026, 10, 14), new FritPartyService(db, clock).Today);
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private static FritPartysController Controller(AppDbContext db, string name, bool primaryManager = false) => new(db, new(db, TimeProvider.System))
    {
        ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.Name, name),
                    new Claim(ClaimTypes.Role, "Admin"),
                    new Claim(PrimaryManagerAccess.ClaimType, primaryManager ? "true" : "false")
                ], "test"))
            }
        }
    };

    private static AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
}
