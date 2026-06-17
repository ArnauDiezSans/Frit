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
    public async Task RankingsService_CalculatesPricePerGameByTotalPlayers()
    {
        await using var context = CreateContext();
        var user = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var game = new Juego
        {
            Nombre = "Catan",
            NumeroJugadoresMin = 2,
            NumeroJugadoresMax = 4,
            Pvp = 10,
            Propietario = user
        };
        context.AddRange(user, game);
        await context.SaveChangesAsync();

        context.Partidas.AddRange(
            new Partida
            {
                JuegoId = game.JuegoId,
                UsuarioCreadorId = user.UsuarioId,
                Fecha = new DateOnly(2026, 6, 1),
                NumeroJugadores = 2
            },
            new Partida
            {
                JuegoId = game.JuegoId,
                UsuarioCreadorId = user.UsuarioId,
                Fecha = new DateOnly(2026, 6, 2),
                NumeroJugadores = 3
            });
        await context.SaveChangesAsync();

        var service = new RankingsService(context);

        var rankings = await service.GetAsync();

        Assert.Equal(2, rankings.Juegos.Single(row => row.Nombre == "Catan").PrecioPorPartida);
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
    public async Task HallOfFameService_AwardsGameWinMedal()
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

        var service = new HallOfFameService(context);

        var medals = await service.GetUserMedalsAsync(arnau.UsuarioId);

        Assert.NotNull(medals);
        var gameMedal = medals.Medals.Single(row => row.MedalId == $"game:{game.JuegoId}");
        Assert.Equal("Catan", gameMedal.Nombre);
        Assert.Equal(1, gameMedal.CurrentValue);
        Assert.Equal("Debutant", gameMedal.RankName);
        Assert.Equal(1, gameMedal.RankLevel);
    }

    [Fact]
    public async Task HallOfFameService_CreatesManualMedalForSelectedUsers()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        context.AddRange(arnau, anna);
        await context.SaveChangesAsync();

        var service = new HallOfFameService(context);

        var result = await service.CreateManualMedalAsync(new ManualMedallaCreateDto
        {
            Nombre = "Organitzador",
            Descripcion = "Ha organitzat una jornada.",
            UsuarioIds = [anna.UsuarioId]
        });
        var hallOfFame = await service.GetHallOfFameAsync("Arnau");
        var annaMedals = await service.GetUserMedalsAsync(anna.UsuarioId);
        var arnauMedals = await service.GetUserMedalsAsync(arnau.UsuarioId);

        Assert.True(result.Success);
        Assert.True(hallOfFame.CanManageManualMedals);
        var entry = Assert.Single(hallOfFame.Entries);
        Assert.Equal("Organitzador", entry.Medal.Nombre);
        Assert.Equal(anna.UsuarioId, entry.BestUser.UsuarioId);
        Assert.Equal("Completada", annaMedals?.Medals.Single(row => row.Nombre == "Organitzador").RankName);
        Assert.Equal("Pendent", arnauMedals?.Medals.Single(row => row.Nombre == "Organitzador").RankName);
    }

    [Fact]
    public async Task HallOfFameService_DoesNotShowIncompleteSetMedalsInHallOfFame()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Usuarios.Add(arnau);
        context.Juegos.AddRange(
            new Juego { JuegoId = 2, Nombre = "Wonder 1", NumeroJugadoresMin = 2, NumeroJugadoresMax = 4, Propietario = arnau },
            new Juego { JuegoId = 3, Nombre = "Wonder 2", NumeroJugadoresMin = 2, NumeroJugadoresMax = 4, Propietario = arnau },
            new Juego { JuegoId = 4, Nombre = "Wonder 3", NumeroJugadoresMin = 2, NumeroJugadoresMax = 4, Propietario = arnau },
            new Juego { JuegoId = 5, Nombre = "Wonder 4", NumeroJugadoresMin = 2, NumeroJugadoresMax = 4, Propietario = arnau },
            new Juego { JuegoId = 96, Nombre = "Wonder 5", NumeroJugadoresMin = 2, NumeroJugadoresMax = 4, Propietario = arnau },
            new Juego { JuegoId = 97, Nombre = "Wonder 6", NumeroJugadoresMin = 2, NumeroJugadoresMax = 4, Propietario = arnau });
        await context.SaveChangesAsync();

        var partida = new Partida
        {
            JuegoId = 2,
            UsuarioCreadorId = arnau.UsuarioId,
            Fecha = new DateOnly(2026, 6, 12),
            NumeroJugadores = 1
        };
        context.Partidas.Add(partida);
        await context.SaveChangesAsync();
        context.PartidaJugadores.Add(new PartidaJugador
        {
            PartidaId = partida.PartidaId,
            UsuarioId = arnau.UsuarioId,
            NombreMostrado = "Arnau",
            Posicion = 1
        });
        await context.SaveChangesAsync();

        var service = new HallOfFameService(context);

        var medals = await service.GetUserMedalsAsync(arnau.UsuarioId);
        var hallOfFame = await service.GetHallOfFameAsync("Arnau");

        Assert.NotNull(medals);
        var wonderFrit = medals.Medals.Single(row => row.Nombre == "WonderFrit");
        Assert.Equal(1, wonderFrit.CurrentValue);
        Assert.Equal("Pendent", wonderFrit.RankName);
        Assert.DoesNotContain(hallOfFame.Entries, row => row.Medal.Nombre == "WonderFrit");
    }

    [Fact]
    public async Task HallOfFameService_MastermindCountsDistinctHeavyBggWins()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Usuarios.Add(arnau);
        await context.SaveChangesAsync();

        var games = Enumerable.Range(1, 9)
            .Select(index => new Juego
            {
                Nombre = $"Heavy {index}",
                DificultadBgg = index <= 8 ? 4.00m : 3.99m,
                NumeroJugadoresMin = 1,
                NumeroJugadoresMax = 4,
                PropietarioId = arnau.UsuarioId
            })
            .ToList();
        context.Juegos.AddRange(games);
        await context.SaveChangesAsync();

        foreach (var game in games)
        {
            var partida = new Partida
            {
                JuegoId = game.JuegoId,
                UsuarioCreadorId = arnau.UsuarioId,
                Fecha = new DateOnly(2026, 6, 12),
                NumeroJugadores = 1
            };
            context.Partidas.Add(partida);
            await context.SaveChangesAsync();
            context.PartidaJugadores.Add(new PartidaJugador
            {
                PartidaId = partida.PartidaId,
                UsuarioId = arnau.UsuarioId,
                NombreMostrado = "Arnau",
                Posicion = 1
            });
        }

        await context.SaveChangesAsync();
        var service = new HallOfFameService(context);

        var medals = await service.GetUserMedalsAsync(arnau.UsuarioId);

        Assert.NotNull(medals);
        var mastermind = medals.Medals.Single(row => row.Nombre == "Mastermind");
        Assert.Equal(8, mastermind.CurrentValue);
        Assert.Equal(8, mastermind.TargetValue);
        Assert.Equal("Completada", mastermind.RankName);
    }

    [Fact]
    public async Task HallOfFameService_OneMenArmyCountsPlayedGamesWithoutVictory()
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

        for (var index = 0; index < 2; index++)
        {
            var partida = new Partida
            {
                JuegoId = game.JuegoId,
                UsuarioCreadorId = arnau.UsuarioId,
                Fecha = new DateOnly(2026, 6, 12),
                NumeroJugadores = 2
            };
            context.Partidas.Add(partida);
            await context.SaveChangesAsync();
            context.PartidaJugadores.AddRange(
                new PartidaJugador
                {
                    PartidaId = partida.PartidaId,
                    UsuarioId = anna.UsuarioId,
                    NombreMostrado = "Anna",
                    Posicion = 1
                },
                new PartidaJugador
                {
                    PartidaId = partida.PartidaId,
                    UsuarioId = arnau.UsuarioId,
                    NombreMostrado = "Arnau",
                    Posicion = 2
                });
        }

        await context.SaveChangesAsync();
        var service = new HallOfFameService(context);

        var medals = await service.GetUserMedalsAsync(arnau.UsuarioId);
        var hallOfFame = await service.GetHallOfFameAsync("Arnau");

        Assert.NotNull(medals);
        var oneMenArmy = medals.Medals.Single(row => row.Nombre == "One men army");
        Assert.Equal(2, oneMenArmy.CurrentValue);
        Assert.Equal(1000, oneMenArmy.TargetValue);
        Assert.Equal("Pendent", oneMenArmy.RankName);
        Assert.DoesNotContain(hallOfFame.Entries, row => row.Medal.Nombre == "One men army");
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
    public async Task CineService_AllowsOneRatingPerUser()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Usuarios.Add(arnau);
        await context.SaveChangesAsync();
        var service = new CineService(context);
        var created = await service.CreateAsync(arnau.UsuarioId, new CinePeliculaCreateDto
        {
            Titulo = "Matrix"
        });

        var first = await service.ValorarAsync(created.Pelicula!.CinePeliculaId, arnau.UsuarioId, new CineValoracionCreateDto
        {
            Nota = 9,
            Observacion = "Funciona sempre."
        });
        var second = await service.ValorarAsync(created.Pelicula.CinePeliculaId, arnau.UsuarioId, new CineValoracionCreateDto
        {
            Nota = 8
        });

        Assert.True(first.Success);
        Assert.False(second.Success);
        Assert.Equal("Ja has valorat aquesta pel·lícula.", second.Error);
        Assert.Single(context.CineValoraciones);
    }

    [Fact]
    public async Task CineService_BlocksRatingsAfterTwentyFourHours()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Usuarios.Add(arnau);
        await context.SaveChangesAsync();
        var pelicula = new CinePelicula
        {
            Titulo = "Alien",
            UsuarioCreadorId = arnau.UsuarioId,
            CreatedAt = DateTime.UtcNow.AddHours(-25)
        };
        context.CinePeliculas.Add(pelicula);
        await context.SaveChangesAsync();
        var service = new CineService(context);

        var result = await service.ValorarAsync(pelicula.CinePeliculaId, arnau.UsuarioId, new CineValoracionCreateDto
        {
            Nota = 10
        });

        Assert.False(result.Success);
        Assert.Equal("Aquesta pel·lícula ja no es pot valorar.", result.Error);
        Assert.Empty(context.CineValoraciones);
    }

    [Fact]
    public async Task CineService_AllowsDecimalRatings()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Usuarios.Add(arnau);
        await context.SaveChangesAsync();
        var service = new CineService(context);
        var created = await service.CreateAsync(arnau.UsuarioId, new CinePeliculaCreateDto
        {
            Titulo = "Noche de bodas"
        });

        var result = await service.ValorarAsync(created.Pelicula!.CinePeliculaId, arnau.UsuarioId, new CineValoracionCreateDto
        {
            Nota = 4.5m
        });

        Assert.True(result.Success);
        Assert.Equal(4.5m, result.Pelicula!.MediaNota);
        Assert.Equal(4.5m, Assert.Single(result.Pelicula.Valoraciones).Nota);
    }

    [Fact]
    public async Task CineService_AttendanceWithoutRatingDoesNotChangeAverage()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        context.Usuarios.AddRange(arnau, anna);
        await context.SaveChangesAsync();
        var service = new CineService(context);
        var created = await service.CreateAsync(arnau.UsuarioId, new CinePeliculaCreateDto
        {
            Titulo = "Arrival"
        });

        var attendance = await service.MarcarAsistenciaAsync(created.Pelicula!.CinePeliculaId, arnau.UsuarioId, new CineAsistenciaCreateDto
        {
            UsuarioId = anna.UsuarioId
        });
        var rating = await service.ValorarAsync(created.Pelicula.CinePeliculaId, arnau.UsuarioId, new CineValoracionCreateDto
        {
            Nota = 8
        });
        var annaRating = await service.ValorarAsync(created.Pelicula.CinePeliculaId, anna.UsuarioId, new CineValoracionCreateDto
        {
            Nota = 6
        });

        Assert.True(attendance.Success);
        Assert.Null(attendance.Pelicula!.MediaNota);
        Assert.Null(attendance.Pelicula.Valoraciones.Single(row => row.UsuarioId == anna.UsuarioId).Nota);
        Assert.True(rating.Success);
        Assert.Equal(8m, rating.Pelicula!.MediaNota);
        Assert.True(annaRating.Success);
        Assert.Equal(7m, annaRating.Pelicula!.MediaNota);
        Assert.Equal(2, context.CineValoraciones.Count());
    }

    [Fact]
    public async Task CsopaService_AllowsAttendanceAfterTwentyFourHours()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        context.Usuarios.AddRange(arnau, anna);
        await context.SaveChangesAsync();
        var activitat = new CsopaActivitat
        {
            Titol = "Sopar antic",
            Tipus = CsopaService.TipusSopar,
            UsuarioCreadorId = arnau.UsuarioId,
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };
        context.CsopaActivitats.Add(activitat);
        await context.SaveChangesAsync();
        var service = new CsopaService(context);

        var result = await service.MarcarAssistenciaAsync(activitat.CsopaActivitatId, arnau.UsuarioId, new CsopaAssistenciaCreateDto
        {
            UsuarioId = anna.UsuarioId
        });

        Assert.True(result.Success);
        Assert.Contains(result.Activitat!.Assistencies, assistencia => assistencia.UsuarioId == anna.UsuarioId);
        Assert.Single(context.CsopaAssistencies);
    }

    [Fact]
    public async Task HallOfFameService_CinefilFritAwardsUsersWithMostMovieRatings()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        var xumi = new Usuario { Nombre = "Xumi", PasswordHash = "hash" };
        context.Usuarios.AddRange(arnau, anna, xumi);
        await context.SaveChangesAsync();
        context.CinePeliculas.AddRange(
            new CinePelicula
            {
                Titulo = "Matrix",
                UsuarioCreadorId = arnau.UsuarioId,
                GrupoPelicula = 1,
                CreatedAt = new DateTime(2026, 6, 14, 12, 0, 0, DateTimeKind.Utc),
                Valoraciones =
                [
                    new CineValoracion { UsuarioId = arnau.UsuarioId, Nota = 9 },
                    new CineValoracion { UsuarioId = anna.UsuarioId, Nota = 8 },
                    new CineValoracion { UsuarioId = xumi.UsuarioId, Nota = 7 }
                ]
            },
            new CinePelicula
            {
                Titulo = "Arrival",
                UsuarioCreadorId = arnau.UsuarioId,
                GrupoPelicula = 1,
                CreatedAt = new DateTime(2026, 6, 21, 12, 0, 0, DateTimeKind.Utc),
                Valoraciones =
                [
                    new CineValoracion { UsuarioId = arnau.UsuarioId, Nota = 8 },
                    new CineValoracion { UsuarioId = anna.UsuarioId, Nota = 8 }
                ]
            },
            new CinePelicula
            {
                Titulo = "Alien",
                UsuarioCreadorId = arnau.UsuarioId,
                GrupoPelicula = 2,
                CreatedAt = new DateTime(2026, 6, 18, 12, 0, 0, DateTimeKind.Utc),
                Valoraciones =
                [
                    new CineValoracion { UsuarioId = arnau.UsuarioId, Nota = 10 },
                    new CineValoracion { UsuarioId = anna.UsuarioId, Nota = 9 }
                ]
            });
        await context.SaveChangesAsync();
        var service = new HallOfFameService(context);

        var hallOfFame = await service.GetHallOfFameAsync("Arnau");

        var entry = hallOfFame.Entries.Single(row => row.Medal.Nombre == "Cinèfil Frit");
        Assert.Equal(2, entry.Medal.TargetValue);
        Assert.Equal(["Anna", "Arnau"], entry.Users.Select(user => user.UsuarioNombre).Order());
        Assert.DoesNotContain(entry.Users, user => user.UsuarioNombre == "Xumi");
    }

    [Fact]
    public async Task HallOfFameService_DiumengeInfalibleCountsCurrentConsecutiveSundayStreak()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        context.Usuarios.AddRange(arnau, anna);
        await context.SaveChangesAsync();
        var latestSunday = GetLatestSundayForTest();
        context.CinePeliculas.AddRange(
            CreateSundayMovie("Diumenge 1", arnau.UsuarioId, latestSunday, arnau.UsuarioId, anna.UsuarioId),
            CreateSundayMovie("Diumenge 2", arnau.UsuarioId, latestSunday.AddDays(-7), arnau.UsuarioId),
            new CinePelicula
            {
                Titulo = "Diumenge normal",
                UsuarioCreadorId = arnau.UsuarioId,
                CreatedAt = latestSunday.AddDays(-14).ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
                Valoraciones =
                [
                    new CineValoracion { UsuarioId = arnau.UsuarioId, Nota = 8 }
                ]
            },
            CreateSundayMovie("Diumenge 4", arnau.UsuarioId, latestSunday.AddDays(-21), arnau.UsuarioId));
        await context.SaveChangesAsync();
        var service = new HallOfFameService(context);

        var hallOfFame = await service.GetHallOfFameAsync("Arnau");

        var entry = hallOfFame.Entries.Single(row => row.Medal.Nombre == "Diumenge infal·lible");
        var user = Assert.Single(entry.Users);
        Assert.Equal("Arnau", user.UsuarioNombre);
        Assert.Equal(2, user.CurrentValue);
        Assert.Equal(2, entry.Medal.RankTargetValue);
    }

    [Fact]
    public async Task HallOfFameService_CsopaAwardsTotalsAndWeekdayStreaks()
    {
        await using var context = CreateContext();
        var arnau = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        var anna = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        context.Usuarios.AddRange(arnau, anna);
        await context.SaveChangesAsync();
        var latestTuesday = GetLatestWeekdayForTest(DayOfWeek.Tuesday);
        var latestThursday = GetLatestWeekdayForTest(DayOfWeek.Thursday);
        context.CsopaActivitats.AddRange(
            CreateCsopaActivity("Sopar 1", CsopaService.TipusSopar, arnau.UsuarioId, latestTuesday, arnau.UsuarioId, anna.UsuarioId),
            CreateCsopaActivity("Sopar 2", CsopaService.TipusSopar, arnau.UsuarioId, latestTuesday.AddDays(-7), arnau.UsuarioId),
            CreateCsopaActivity("Gymfrit 1", CsopaService.TipusGymfrit, arnau.UsuarioId, latestThursday, anna.UsuarioId),
            CreateCsopaActivity("Gymfrit 2", CsopaService.TipusGymfrit, arnau.UsuarioId, latestThursday.AddDays(-7), anna.UsuarioId));
        await context.SaveChangesAsync();
        var service = new HallOfFameService(context);

        var hallOfFame = await service.GetHallOfFameAsync("Arnau");

        var soparTotal = hallOfFame.Entries.Single(row => row.Medal.Nombre == "Soparista Frit");
        Assert.Contains(soparTotal.Users, user => user.UsuarioNombre == "Arnau" && user.CurrentValue == 2);
        var soparStreak = hallOfFame.Entries.Single(row => row.Medal.Nombre == "Dimarts de cullera");
        Assert.Contains(soparStreak.Users, user => user.UsuarioNombre == "Arnau" && user.CurrentValue == 2);
        var gymfritTotal = hallOfFame.Entries.Single(row => row.Medal.Nombre == "Gymfriter");
        Assert.Single(gymfritTotal.Users);
        Assert.Equal("Anna", gymfritTotal.Users[0].UsuarioNombre);
        var gymfritStreak = hallOfFame.Entries.Single(row => row.Medal.Nombre == "Dijous de ferro");
        Assert.Equal(2, Assert.Single(gymfritStreak.Users).CurrentValue);
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
    public async Task JuegoService_CreateAsync_GeneratesMedalImageWhenBggIdIsSet()
    {
        await using var context = CreateContext();
        var user = new Usuario { Nombre = "Arnau", PasswordHash = "hash" };
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();
        var medalImageService = new FakeBggMedalImageService();
        var service = new JuegoService(
            context,
            new TestHttpClientFactory(new HttpClient(new RecordingHttpMessageHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)))),
            new ConfigurationBuilder().Build(),
            medalImageService);

        var result = await service.CreateAsync(new JuegoDto
        {
            Nombre = "Catan",
            BggId = 13,
            NumeroJugadoresMin = 2,
            NumeroJugadoresMax = 4,
            PropietarioId = user.UsuarioId,
            Tipo = "Economic"
        });

        Assert.True(result.Success);
        var call = Assert.Single(medalImageService.Calls);
        Assert.Equal(result.Juego!.JuegoId, call.JuegoId);
        Assert.Equal(13, call.BggId);
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
                .Build(),
            new FakeBggMedalImageService());

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
                new ConfigurationBuilder().Build(),
                new FakeBggMedalImageService());

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
                    .Build(),
                new FakeBggMedalImageService());

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

    private static CinePelicula CreateSundayMovie(
        string titulo,
        int usuarioCreadorId,
        DateOnly sunday,
        params int[] usuarioIds)
    {
        return new CinePelicula
        {
            Titulo = titulo,
            UsuarioCreadorId = usuarioCreadorId,
            CreatedAt = sunday.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
            GrupoPelicula = 1,
            Valoraciones = usuarioIds
                .Select((usuarioId, index) => new CineValoracion
                {
                    UsuarioId = usuarioId,
                    Nota = 10 - index
                })
                .ToList()
        };
    }

    private static CsopaActivitat CreateCsopaActivity(
        string titol,
        int tipus,
        int usuarioCreadorId,
        DateOnly day,
        params int[] usuarioIds)
    {
        return new CsopaActivitat
        {
            Titol = titol,
            Tipus = tipus,
            UsuarioCreadorId = usuarioCreadorId,
            CreatedAt = day.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc),
            Assistencies = usuarioIds
                .Select(usuarioId => new CsopaAssistencia
                {
                    UsuarioId = usuarioId
                })
                .ToList()
        };
    }

    private static DateOnly GetLatestSundayForTest()
    {
        var madridNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, GetMadridTimeZoneForTest());
        var today = DateOnly.FromDateTime(madridNow);
        return today.AddDays(-(int)today.DayOfWeek);
    }

    private static DateOnly GetLatestWeekdayForTest(DayOfWeek weekday)
    {
        var madridNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, GetMadridTimeZoneForTest());
        var today = DateOnly.FromDateTime(madridNow);
        var daysSinceWeekday = ((int)today.DayOfWeek - (int)weekday + 7) % 7;
        return today.AddDays(-daysSinceWeekday);
    }

    private static TimeZoneInfo GetMadridTimeZoneForTest()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid");
        }
        catch (Exception error) when (error is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Romance Standard Time");
        }
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

    private sealed class FakeBggMedalImageService : IBggMedalImageService
    {
        public List<(int JuegoId, int BggId)> Calls { get; } = new();

        public Task EnsureGameMedalImageAsync(int juegoId, int bggId)
        {
            Calls.Add((juegoId, bggId));
            return Task.CompletedTask;
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
