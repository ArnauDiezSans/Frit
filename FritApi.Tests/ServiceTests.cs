using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace FritApi.Tests;

public class ServiceTests
{
    [Fact]
    public void PasswordService_VerifiesHashedPassword()
    {
        var service = new PasswordService();

        var hash = service.HashPassword("secret");

        Assert.True(service.VerifyPassword(hash, "secret"));
        Assert.False(service.VerifyPassword(hash, "wrong"));
    }

    [Fact]
    public async Task LaLlistaService_MarksGamesExpiringThisWeekAsRed()
    {
        await using var context = CreateContext();
        var user = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var game = new Juego
        {
            Nombre = "Catan",
            NumeroJugadoresMin = 2,
            NumeroJugadoresMax = 4,
            Propietario = user
        };
        context.Add(user);
        context.Add(game);
        await context.SaveChangesAsync();

        context.Partidas.Add(new Partida
        {
            JuegoId = game.JuegoId,
            UsuarioCreadorId = user.UsuarioId,
            Fecha = new DateOnly(2025, 6, 4),
            NumeroJugadores = 3
        });
        await context.SaveChangesAsync();

        var service = new LaLlistaService(context);

        var rows = await service.GetAllAsync(new DateOnly(2026, 6, 5));

        Assert.Single(rows);
        Assert.Equal("red", rows[0].EstadoCaducidad);
    }

    [Fact]
    public async Task LaLlistaService_ExcludesNoLlistaGames()
    {
        await using var context = CreateContext();
        var user = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Add(user);
        context.Juegos.AddRange(
            new Juego
            {
                Nombre = "Catan",
                Tipo = "Eurogame",
                NumeroJugadoresMin = 2,
                NumeroJugadoresMax = 4,
                Propietario = user
            },
            new Juego
            {
                Nombre = "Promo",
                Tipo = "No llista",
                NumeroJugadoresMin = 2,
                NumeroJugadoresMax = 4,
                Propietario = user
            });
        await context.SaveChangesAsync();

        var service = new LaLlistaService(context);

        var rows = await service.GetAllAsync(new DateOnly(2026, 6, 5));

        var row = Assert.Single(rows);
        Assert.Equal("Catan", row.Nombre);
    }

    [Fact]
    public async Task RankingsService_CountsPositionOneAsVictory()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        var game = new Juego
        {
            Nombre = "Catan",
            NumeroJugadoresMin = 2,
            NumeroJugadoresMax = 4,
            Propietario = arnau
        };
        context.AddRange(arnau, anna, game);
        await context.SaveChangesAsync();

        var partida = new Partida
        {
            JuegoId = game.JuegoId,
            UsuarioCreadorId = arnau.UsuarioId,
            Fecha = new DateOnly(2026, 6, 5),
            DuracionMinutos = 60,
            NumeroJugadores = 2
        };
        context.Partidas.Add(partida);
        await context.SaveChangesAsync();

        context.PartidaJugadores.AddRange(
            new PartidaJugador
            {
                PartidaId = partida.PartidaId,
                UsuarioId = arnau.UsuarioId,
                NombreMostrado = "Arnau",
                Posicion = 1
            },
            new PartidaJugador
            {
                PartidaId = partida.PartidaId,
                UsuarioId = anna.UsuarioId,
                NombreMostrado = "Anna",
                Posicion = 2
            });
        await context.SaveChangesAsync();

        var service = new RankingsService(context);

        var rankings = await service.GetAsync();

        var arnauRanking = rankings.Usuarios.Single(row => row.UsuarioNombre == "Arnau");
        var annaRanking = rankings.Usuarios.Single(row => row.UsuarioNombre == "Anna");
        Assert.Equal(1, arnauRanking.Victorias);
        Assert.Equal(0, annaRanking.Victorias);
    }

    [Fact]
    public async Task UsuarioService_UpdateProfile_DoesNotChangePasswordHash()
    {
        await using var context = CreateContext();
        var passwordService = new PasswordService();
        var originalHash = passwordService.HashPassword("secret");
        var user = new Usuario { Nombre = "Arnau", PasswordHash = originalHash };
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();

        var service = new UsuarioService(context, passwordService);

        await service.UpdateProfileAsync(user.UsuarioId, new UsuarioProfileUpdateDto
        {
            Nombre = "Arnau Nou",
            Grupo = "Frit"
        });

        var updated = await context.Usuarios.SingleAsync(usuario => usuario.UsuarioId == user.UsuarioId);
        Assert.Equal(originalHash, updated.PasswordHash);
        Assert.Equal("Arnau Nou", updated.Nombre);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }
}
