using System.Net;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
                Posicion = 1,
                Puntos = 42
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
        Assert.Equal(42, rankings.Jugadores.Single(row => row.UsuarioNombre == "Arnau").Puntos);
    }

    [Fact]
    public async Task RankingsService_CountsPlayersMentionedInTeamDisplayedName()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var xumi = new Usuario { Nombre = "Xumi", PasswordHash = "hash" };
        var gemma = new Usuario { Nombre = "Gemma", PasswordHash = "hash" };
        var game = new Juego
        {
            Nombre = "Agricola",
            NumeroJugadoresMin = 2,
            NumeroJugadoresMax = 4,
            Propietario = arnau
        };
        context.AddRange(arnau, xumi, gemma, game);
        await context.SaveChangesAsync();

        var partida = new Partida
        {
            JuegoId = game.JuegoId,
            UsuarioCreadorId = arnau.UsuarioId,
            Fecha = new DateOnly(2024, 12, 5),
            DuracionMinutos = 135,
            NumeroJugadores = 4
        };
        context.Partidas.Add(partida);
        await context.SaveChangesAsync();

        context.PartidaJugadores.AddRange(
            new PartidaJugador
            {
                PartidaId = partida.PartidaId,
                NombreMostrado = "Arnau, Xumi",
                Posicion = 1,
                Puntos = 49
            },
            new PartidaJugador
            {
                PartidaId = partida.PartidaId,
                UsuarioId = gemma.UsuarioId,
                NombreMostrado = "Gemma",
                Posicion = 2,
                Puntos = 38
            });
        await context.SaveChangesAsync();

        var service = new RankingsService(context);

        var rankings = await service.GetAsync();

        var arnauRanking = rankings.Usuarios.Single(row => row.UsuarioNombre == "Arnau");
        var xumiRanking = rankings.Usuarios.Single(row => row.UsuarioNombre == "Xumi");
        var gemmaRanking = rankings.Usuarios.Single(row => row.UsuarioNombre == "Gemma");
        Assert.Equal(1, arnauRanking.PartidasTotales);
        Assert.Equal(1, arnauRanking.Victorias);
        Assert.Equal(1, xumiRanking.PartidasTotales);
        Assert.Equal(1, xumiRanking.Victorias);
        Assert.Equal(1, gemmaRanking.PartidasTotales);
        Assert.Equal(0, gemmaRanking.Victorias);
    }

    [Fact]
    public async Task PartidaJugadorService_AllowsSharedPositions()
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
            Fecha = new DateOnly(2026, 6, 10),
            NumeroJugadores = 2
        };
        context.Partidas.Add(partida);
        await context.SaveChangesAsync();

        var service = new PartidaJugadorService(context);

        var first = await service.CreateAsync(new PartidaJugadorDto
        {
            PartidaId = partida.PartidaId,
            UsuarioId = arnau.UsuarioId,
            NombreMostrado = "Arnau",
            Posicion = 1
        });
        var second = await service.CreateAsync(new PartidaJugadorDto
        {
            PartidaId = partida.PartidaId,
            UsuarioId = anna.UsuarioId,
            NombreMostrado = "Anna",
            Posicion = 1
        });

        Assert.True(first.Success);
        Assert.True(second.Success);
        Assert.Equal(2, await context.PartidaJugadores.CountAsync(jugador =>
            jugador.PartidaId == partida.PartidaId &&
            jugador.Posicion == 1));
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

    [Fact]
    public async Task JuegoService_GetFromBgg_SendsBearerToken()
    {
        await using var context = CreateContext();
        var handler = new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                <items>
                  <item id="13" type="boardgame">
                    <name type="primary" value="Catan" />
                    <minplayers value="3" />
                    <maxplayers value="4" />
                    <link type="boardgamecategory" value="Economic" />
                    <link type="boardgamecategory" value="Negotiation" />
                    <statistics>
                      <ratings>
                        <averageweight value="2.31" />
                      </ratings>
                    </statistics>
                  </item>
                </items>
                """)
        });
        var service = new JuegoService(
            context,
            new TestHttpClientFactory(new HttpClient(handler)),
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Bgg:ApplicationToken"] = "test-token"
                })
                .Build());

        var result = await service.GetFromBggAsync(13);

        Assert.True(result.Success);
        Assert.Equal("Econòmic, Negociació", result.Juego?.Tipo);
        Assert.NotNull(handler.LastRequest);
        Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization?.Scheme);
        Assert.Equal("test-token", handler.LastRequest.Headers.Authorization?.Parameter);
    }

    [Fact]
    public async Task JuegoService_GetFromBgg_ReadsTokenFromEnvironment()
    {
        await using var context = CreateContext();
        var handler = new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                <items>
                  <item id="13" type="boardgame">
                    <name type="primary" value="Catan" />
                    <minplayers value="3" />
                    <maxplayers value="4" />
                  </item>
                </items>
                """)
        });
        Environment.SetEnvironmentVariable("BGG_APPLICATION_TOKEN", "env-token");

        try
        {
            var service = new JuegoService(
                context,
                new TestHttpClientFactory(new HttpClient(handler)),
                new ConfigurationBuilder().Build());

            var result = await service.GetFromBggAsync(13);

            Assert.True(result.Success);
            Assert.NotNull(handler.LastRequest);
            Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization?.Scheme);
            Assert.Equal("env-token", handler.LastRequest.Headers.Authorization?.Parameter);
        }
        finally
        {
            Environment.SetEnvironmentVariable("BGG_APPLICATION_TOKEN", null);
        }
    }

    [Fact]
    public async Task JuegoService_GetFromBgg_IgnoresEmptyConfiguredToken()
    {
        await using var context = CreateContext();
        var handler = new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("""
                <items>
                  <item id="13" type="boardgame">
                    <name type="primary" value="Catan" />
                    <minplayers value="3" />
                    <maxplayers value="4" />
                  </item>
                </items>
                """)
        });
        Environment.SetEnvironmentVariable("BGG_APPLICATION_TOKEN", "env-token");

        try
        {
            var service = new JuegoService(
                context,
                new TestHttpClientFactory(new HttpClient(handler)),
                new ConfigurationBuilder()
                    .AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["Bgg:ApplicationToken"] = ""
                    })
                    .Build());

            var result = await service.GetFromBggAsync(13);

            Assert.True(result.Success);
            Assert.NotNull(handler.LastRequest);
            Assert.Equal("env-token", handler.LastRequest.Headers.Authorization?.Parameter);
        }
        finally
        {
            Environment.SetEnvironmentVariable("BGG_APPLICATION_TOKEN", null);
        }
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    private sealed class TestHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _httpClient;

        public TestHttpClientFactory(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public HttpClient CreateClient(string name)
        {
            return _httpClient;
        }
    }

    private sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responseFactory;

        public RecordingHttpMessageHandler(Func<HttpRequestMessage, HttpResponseMessage> responseFactory)
        {
            _responseFactory = responseFactory;
        }

        public HttpRequestMessage? LastRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            return Task.FromResult(_responseFactory(request));
        }
    }
}
