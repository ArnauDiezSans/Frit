using System.Globalization;
using System.Text;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class HallOfFameService
{
    private const string DefaultIconPath = "/assets/medallas/default-medal.svg";
    private readonly AppDbContext _context;

    private static readonly MedalRank[] GameWinRanks =
    [
        new("Debutant", 1, "#6b7280", false),
        new("Aprenent", 2, "#8a5a32", false),
        new("Iniciat", 3, "#2f7f52", false),
        new("Habitual", 5, "#2563a9", false),
        new("Veterà", 10, "#7c3aed", false),
        new("Especialista", 15, "#6b7280", true),
        new("Expert", 25, "#8a5a32", true),
        new("Mestre", 50, "#2f7f52", true),
        new("Gurú", 80, "#2563a9", true),
        new("Llegenda", 100, "#7c3aed", true)
    ];

    private static readonly CodedSetMedal[] CodedSetMedals =
    [
        new(
            "set:wonderfrit",
            "WonderFrit",
            "Es tracta d'haver-los guanyat tots!",
            [2, 3, 4, 5, 96, 97]),
        new(
            "set:chino-aqui",
            "Chino aqui",
            "Guanya almenys una partida a tots els jocs de la col·lecció oriental.",
            [6, 36, 90, 101, 102, 130, 150, 160, 169, 180, 179, 181, 183, 187, 190, 198]),
        new(
            "set:pastor",
            "Pastor",
            "Guanya una partida als jocs que tenen ovelles de fusta.",
            [7, 189, 32]),
        new(
            "set:ese-portugues",
            "Ese portugués, hijoputa es",
            "Guanya una partida als jocs portuguesos.",
            [15, 16, 114, 217]),
        new(
            "set:malvat",
            "Malvat",
            "Guanya una partida als tres Villainous.",
            [53, 124, 177]),
        new(
            "set:primer-en-actuar",
            "Primer/a en actuar",
            "Guanya almenys una partida a tots els jocs de rapidesa.",
            [214, 76, 77, 104, 121, 139, 163, 200, 208, 86, 99, 106, 113]),
        new(
            "set:arquitecte-del-paper",
            "Arquitecte/a del paper",
            "Guanya almenys una partida a tots els jocs de paper i llapis.",
            [4, 214, 130, 135, 153, 207])
    ];

    private static readonly DynamicMedal[] DynamicMedals =
    [
        new(
            "dynamic:mastermind",
            "Mastermind",
            "Guanya a 8 jocs diferents amb Pes BGG de 4.00 o més.",
            "HeavyBggWins",
            8),
        new(
            "dynamic:one-men-army",
            "One man army",
            "Haver jugat 1000 partides.",
            "TotalPlays",
            1000)
    ];

    private static readonly ThresholdSetMedal[] ThresholdSetMedals =
    [
        new("dynamic:noe-arca", "Noè, el de l'arca", "Guanya 12 jocs diferents d'Animals.", 12,
            [7, 13, 18, 24, 29, 32, 44, 46, 52, 55, 57, 59, 73, 74, 75, 79, 86, 91, 116, 123, 137, 140, 142, 147, 157, 183, 195, 209, 211]),
        new("dynamic:rei-mides", "Rei/Reina Mides", "Guanya 15 jocs Econòmics diferents.", 15,
            [2, 5, 7, 6, 11, 19, 20, 21, 23, 31, 32, 33, 34, 36, 40, 52, 84, 87, 97, 100, 108, 112, 114, 117, 118, 125, 132, 134, 136, 142, 143, 145, 148, 153, 164, 174, 175, 184, 185, 186, 187, 188, 198, 201, 203, 206, 210]),
        new("dynamic:mestre-cartes", "Mestre/a de les cartes", "Guanya 20 jocs de cartes diferents.", 20,
            [2, 5, 8, 13, 17, 18, 26, 37, 39, 41, 42, 46, 47, 51, 53, 54, 56, 66, 68, 69, 71, 73, 74, 75, 77, 78, 79, 80, 82, 86, 88, 89, 93, 96, 97, 106, 111, 109, 115, 118, 124, 125, 138, 147, 150, 158, 160, 165, 166, 168, 170, 173, 174, 175, 176, 180, 179, 191, 197, 198, 199, 205, 208, 209, 211]),
        new("dynamic:urbanista", "Urbanista", "Guanya 10 jocs de Construcció de ciutats.", 10,
            [2, 4, 5, 9, 20, 21, 26, 34, 36, 37, 40, 52, 73, 79, 100, 114, 120, 130, 134, 136, 148, 207]),
        new("dynamic:senyor-daus", "Senyor/a dels daus", "Guanya 8 jocs de Daus diferents.", 8,
            [4, 25, 44, 65, 101, 102, 103, 116, 135, 149, 153, 159, 172, 177, 186, 187, 202]),
        new("dynamic:ment-criminal", "Ment criminal", "Guanya 7 jocs de Deducció diferents.", 7,
            [17, 22, 37, 41, 42, 47, 49, 61, 94, 95, 128, 160, 166, 171]),
        new("dynamic:trencaclosques-huma", "Trencaclosques humà", "Guanya 8 jocs de Trencaclosques diferents.", 8,
            [16, 24, 30, 59, 76, 78, 91, 131, 139, 141, 143, 146, 147, 159, 168, 182, 200]),
        new("dynamic:geometra", "Geòmetra", "Guanya 8 jocs d'Estratègia abstracta.", 8,
            [15, 16, 24, 72, 85, 91, 119, 127, 131, 140, 141, 143, 145, 158, 159, 168]),
        new("dynamic:fundador-imperis", "Fundador/a d'imperis", "Guanya 6 jocs de Civilització.", 6,
            [2, 5, 69, 71, 84, 97, 151, 161, 184, 185, 188]),
        new("dynamic:pages-any", "Pagès de l'any", "Guanya 7 jocs d'Agricultura.", 7,
            [7, 6, 12, 32, 33, 59, 109, 144, 148, 161, 162, 183, 189, 206]),
        new("dynamic:anima-festa", "Ànima de la festa", "Guanya 12 jocs de festa diferents.", 12,
            [8, 22, 41, 42, 47, 49, 54, 61, 66, 82, 86, 94, 98, 99, 128, 139, 163, 166, 180, 179, 191, 192, 196, 208]),
        new("set:capita-picard", "Capità Jean-Luc Picard", "Guanya tots els jocs d'Exploració espacial.", 8,
            [45, 69, 84, 134, 149, 167, 172, 185]),
        new("set:capita-sparrow", "Capità Jack Sparrow", "Guanya tots els jocs Nàutics o de Pirates.", 5,
            [27, 53, 132, 170, 178]),
        new("set:interrail", "Interrail", "Guanya tots els jocs de Trens.", 3,
            [14, 23, 130]),
        new("dynamic:diplomatic", "Diplomàtic/a", "Guanya 5 jocs de Negociació.", 5,
            [31, 36, 45, 66, 80, 105, 157, 162])
    ];

    public HallOfFameService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<HallOfFameDto> GetHallOfFameAsync(string? currentUserName)
    {
        var progress = await BuildAllProgressAsync();
        var entries = progress
            .Where(row => ShouldShowInHallOfFame(row.Progress))
            .GroupBy(row => GetHallOfFameEntryKey(row.Progress))
            .Select(group =>
            {
                var orderedUsers = group
                    .OrderByDescending(row => row.Progress.RankLevel)
                    .ThenByDescending(row => row.Progress.CurrentValue)
                    .ThenBy(row => row.UsuarioNombre)
                    .ToList();
                var best = orderedUsers.First();

                return new HallOfFameEntryDto
                {
                    EntryId = group.Key,
                    Medal = best.Progress,
                    BestUser = new MedalUserProgressDto
                    {
                        UsuarioId = best.UsuarioId,
                        UsuarioNombre = best.UsuarioNombre,
                        CurrentValue = best.Progress.CurrentValue,
                        RankName = best.Progress.RankName,
                        RankLevel = best.Progress.RankLevel
                    },
                    Users = orderedUsers
                        .Select(row => new MedalUserProgressDto
                        {
                            UsuarioId = row.UsuarioId,
                            UsuarioNombre = row.UsuarioNombre,
                            CurrentValue = row.Progress.CurrentValue,
                            RankName = row.Progress.RankName,
                            RankLevel = row.Progress.RankLevel
                        })
                        .ToList()
                };
            })
            .OrderByDescending(row => row.Medal.EpicScore)
            .ThenBy(row => row.Medal.Nombre)
            .ToList();

        return new HallOfFameDto
        {
            CanManageManualMedals = IsHallOfFameAdmin(currentUserName),
            Entries = entries
        };
    }

    public async Task<UserMedalsDto?> GetUserMedalsAsync(int usuarioId)
    {
        var usuario = await _context.Usuarios
            .AsNoTracking()
            .FirstOrDefaultAsync(row => row.UsuarioId == usuarioId);

        if (usuario is null || IsExternalUser(usuario))
        {
            return null;
        }

        var progress = await BuildAllProgressAsync();

        return new UserMedalsDto
        {
            UsuarioId = usuario.UsuarioId,
            UsuarioNombre = usuario.Nombre,
            Medals = progress
                .Where(row => row.UsuarioId == usuario.UsuarioId)
                .Select(row => row.Progress)
                .OrderByDescending(row => row.EpicScore)
                .ThenBy(row => row.Nombre)
                .ToList()
        };
    }

    public async Task<(bool Success, string? Error)> CreateManualMedalAsync(ManualMedallaCreateDto dto)
    {
        var nombre = dto.Nombre.Trim();
        if (string.IsNullOrWhiteSpace(nombre))
        {
            return (false, "El nom de la medalla és obligatori.");
        }

        var userIds = dto.UsuarioIds.Distinct().ToHashSet();
        var validUserIds = await _context.Usuarios
            .Where(usuario =>
                userIds.Contains(usuario.UsuarioId) &&
                usuario.UsuarioId != ExternalUserPolicy.ExternalUserId &&
                usuario.Nombre != ExternalUserPolicy.ExternalUserName)
            .Select(usuario => usuario.UsuarioId)
            .ToListAsync();

        var medalla = new ManualMedalla
        {
            Nombre = nombre,
            Descripcion = dto.Descripcion.Trim(),
            IconPath = string.IsNullOrWhiteSpace(dto.IconPath) ? DefaultIconPath : dto.IconPath.Trim()
        };

        foreach (var usuarioId in validUserIds)
        {
            medalla.Usuarios.Add(new ManualMedallaUsuario { UsuarioId = usuarioId });
        }

        _context.ManualMedallas.Add(medalla);
        await _context.SaveChangesAsync();

        return (true, null);
    }

    public static bool IsHallOfFameAdmin(string? userName)
    {
        return string.Equals(userName, "Arnau", StringComparison.Ordinal);
    }

    private async Task<List<UserMedalProgressRow>> BuildAllProgressAsync()
    {
        var usuarios = await _context.Usuarios
            .AsNoTracking()
            .Where(usuario =>
                usuario.UsuarioId != ExternalUserPolicy.ExternalUserId &&
                usuario.Nombre != ExternalUserPolicy.ExternalUserName)
            .OrderBy(usuario => usuario.Nombre)
            .ToListAsync();
        var juegos = await _context.Juegos
            .AsNoTracking()
            .OrderBy(juego => juego.Nombre)
            .ToListAsync();
        var partidas = await _context.Partidas
            .AsNoTracking()
            .Include(partida => partida.Juego)
            .Include(partida => partida.Jugadores)
            .ToListAsync();
        var manualMedallas = await _context.ManualMedallas
            .AsNoTracking()
            .Include(medalla => medalla.Usuarios)
            .OrderBy(medalla => medalla.Nombre)
            .ToListAsync();
        var cinePeliculas = await _context.CinePeliculas
            .AsNoTracking()
            .Include(pelicula => pelicula.Valoraciones)
            .ToListAsync();
        var csopaActivitats = await _context.CsopaActivitats
            .AsNoTracking()
            .Include(activitat => activitat.Assistencies)
            .ToListAsync();
        var remadaPoints = await _context.RemadaJugadors
            .AsNoTracking()
            .GroupBy(jugador => jugador.UsuarioId)
            .Select(group => new
            {
                UsuarioId = group.Key,
                Punts = group.Sum(jugador => jugador.Punts)
            })
            .ToDictionaryAsync(row => row.UsuarioId, row => row.Punts);

        var wins = BuildWinLookup(partidas, usuarios);
        var plays = BuildPlayCountLookup(partidas, usuarios);
        var playedGames = BuildPlayedGamesLookup(partidas, usuarios);
        var winningPlayerCounts = BuildWinningPlayerCountsLookup(partidas, usuarios);
        var winningCategories = BuildWinningCategoryCountLookup(wins, juegos);
        var calendarStreaks = BuildMonthlyPlayStreakLookup(partidas, usuarios);
        var phoenixWins = BuildPhoenixWinLookup(partidas, usuarios);
        var tiedFirstWins = BuildTiedFirstWinLookup(partidas, usuarios);
        var juegosById = juegos.ToDictionary(juego => juego.JuegoId);
        var cooperativeGames = juegos
            .Where(juego =>
                ContainsGameType(juego.Tipo, "cooperatiu") &&
                !ContainsGameType(juego.Tipo, "no llista"))
            .OrderBy(juego => juego.Nombre)
            .ToList();
        var teamGames = juegos
            .Where(juego =>
                ContainsGameType(juego.Tipo, "equips") &&
                !ContainsGameType(juego.Tipo, "no llista"))
            .OrderBy(juego => juego.Nombre)
            .ToList();
        var twoPlayerGames = juegos
            .Where(juego =>
                juego.NumeroJugadoresMin == 2 &&
                juego.NumeroJugadoresMax == 2 &&
                !ContainsGameType(juego.Tipo, "no llista"))
            .OrderBy(juego => juego.Nombre)
            .ToList();
        var cineTotals = BuildCineTotalRatingsLookup(cinePeliculas);
        var cineTotalTarget = cineTotals.Count > 0 ? cineTotals.Values.Max() : 0;
        var cineSundayStreaks = BuildCineSundayStreakLookup(cinePeliculas, usuarios, GetFritToday(DateTime.UtcNow));
        var cineSundayTarget = cineSundayStreaks.Count > 0 ? cineSundayStreaks.Values.Max() : 0;
        var soparTotals = BuildCsopaTotalAttendanceLookup(csopaActivitats, CsopaService.TipusSopar);
        var soparTotalTarget = soparTotals.Count > 0 ? soparTotals.Values.Max() : 0;
        var gymfritTotals = BuildCsopaTotalAttendanceLookup(csopaActivitats, CsopaService.TipusGymfrit);
        var gymfritTotalTarget = gymfritTotals.Count > 0 ? gymfritTotals.Values.Max() : 0;
        var today = GetFritToday(DateTime.UtcNow);
        var soparTuesdayStreaks = BuildCsopaWeekdayStreakLookup(
            csopaActivitats,
            usuarios,
            CsopaService.TipusSopar,
            DayOfWeek.Tuesday,
            today);
        var soparTuesdayTarget = soparTuesdayStreaks.Count > 0 ? soparTuesdayStreaks.Values.Max() : 0;
        var gymfritThursdayStreaks = BuildCsopaWeekdayStreakLookup(
            csopaActivitats,
            usuarios,
            CsopaService.TipusGymfrit,
            DayOfWeek.Thursday,
            today);
        var gymfritThursdayTarget = gymfritThursdayStreaks.Count > 0 ? gymfritThursdayStreaks.Values.Max() : 0;
        var rows = new List<UserMedalProgressRow>();

        foreach (var usuario in usuarios)
        {
            foreach (var juego in juegos)
            {
                var winsForGame = wins.GetValueOrDefault((usuario.UsuarioId, juego.JuegoId));
                rows.Add(new UserMedalProgressRow(
                    usuario.UsuarioId,
                    usuario.Nombre,
                    BuildRankedProgress(
                        $"game:{juego.JuegoId}",
                        juego.Nombre,
                        $"Guanya partides a {juego.Nombre}.",
                        GetGameIconPath(juego.JuegoId),
                        "GameWins",
                        winsForGame)));
            }

            foreach (var medal in CodedSetMedals)
            {
                var completedGames = medal.JuegoIds.Count(juegoId =>
                    wins.GetValueOrDefault((usuario.UsuarioId, juegoId)) > 0);
                rows.Add(new UserMedalProgressRow(
                    usuario.UsuarioId,
                    usuario.Nombre,
                    BuildSingleTargetProgress(
                        medal.MedalId,
                        medal.Nombre,
                        medal.Descripcion,
                        DefaultIconPath,
                        "GameSetWins",
                        completedGames,
                        medal.JuegoIds.Length,
                        medal.JuegoIds
                            .Where(juegosById.ContainsKey)
                            .Select(juegoId => new MedalGameDto
                            {
                                JuegoId = juegoId,
                                Nombre = juegosById[juegoId].Nombre
                            })
                            .OrderBy(juego => juego.Nombre)
                            .ToList())));
            }

            foreach (var medal in ThresholdSetMedals)
            {
                var completedGames = medal.JuegoIds.Count(juegoId =>
                    wins.GetValueOrDefault((usuario.UsuarioId, juegoId)) > 0);
                rows.Add(new UserMedalProgressRow(
                    usuario.UsuarioId,
                    usuario.Nombre,
                    BuildSingleTargetProgress(
                        medal.MedalId,
                        medal.Nombre,
                        medal.Descripcion,
                        DefaultIconPath,
                        "GameSetWins",
                        completedGames,
                        medal.TargetValue,
                        medal.JuegoIds
                            .Where(juegosById.ContainsKey)
                            .Select(juegoId => new MedalGameDto
                            {
                                JuegoId = juegoId,
                                Nombre = juegosById[juegoId].Nombre
                            })
                            .OrderBy(juego => juego.Nombre)
                            .ToList())));
            }

            var cooperativeWins = cooperativeGames.Count(juego =>
                wins.GetValueOrDefault((usuario.UsuarioId, juego.JuegoId)) > 0);
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress(
                    "set:primer-entre-iguals",
                    "Primer entre iguals",
                    "Es tracta d'haver guanyat tots els jocs cooperatius, excloent els No llista.",
                    DefaultIconPath,
                    "GameSetWins",
                    cooperativeWins,
                    cooperativeGames.Count,
                    cooperativeGames
                        .Select(juego => new MedalGameDto
                        {
                            JuegoId = juego.JuegoId,
                            Nombre = juego.Nombre
                        })
                        .ToList())));

            var teamWins = teamGames.Count(juego =>
                wins.GetValueOrDefault((usuario.UsuarioId, juego.JuegoId)) > 0);
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress(
                    "set:engranatge-perfecte",
                    "Engranatge perfecte",
                    "Es tracta d'haver guanyat tots els jocs per equips, excloent els No llista.",
                    DefaultIconPath,
                    "GameSetWins",
                    teamWins,
                    teamGames.Count,
                    teamGames
                        .Select(juego => new MedalGameDto
                        {
                            JuegoId = juego.JuegoId,
                            Nombre = juego.Nombre
                        })
                        .ToList())));

            var twoPlayerWins = twoPlayerGames.Count(juego =>
                wins.GetValueOrDefault((usuario.UsuarioId, juego.JuegoId)) > 0);
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress(
                    "set:duelista",
                    "Duelista",
                    "Es tracta d'haver guanyat tots els jocs exclusius per a dos jugadors, excloent els No llista.",
                    DefaultIconPath,
                    "GameSetWins",
                    twoPlayerWins,
                    twoPlayerGames.Count,
                    twoPlayerGames
                        .Select(juego => new MedalGameDto
                        {
                            JuegoId = juego.JuegoId,
                            Nombre = juego.Nombre
                        })
                        .ToList())));

            foreach (var medal in DynamicMedals)
            {
                var currentValue = medal.Tipo switch
                {
                    "HeavyBggWins" => juegos.Count(juego =>
                        juego.DificultadBgg >= 4.00m &&
                        wins.GetValueOrDefault((usuario.UsuarioId, juego.JuegoId)) > 0),
                    "TotalPlays" => plays.GetValueOrDefault(usuario.UsuarioId),
                    _ => 0
                };

                rows.Add(new UserMedalProgressRow(
                    usuario.UsuarioId,
                    usuario.Nombre,
                    BuildSingleTargetProgress(
                        medal.MedalId,
                        medal.Nombre,
                        medal.Descripcion,
                        DefaultIconPath,
                        medal.Tipo,
                        currentValue,
                        medal.TargetValue)));
            }

            var wonNonListGames = juegos.Count(juego =>
                !ContainsGameType(juego.Tipo, "no llista") &&
                wins.GetValueOrDefault((usuario.UsuarioId, juego.JuegoId)) > 0);
            var playedNonListGames = juegos.Count(juego =>
                !ContainsGameType(juego.Tipo, "no llista") &&
                playedGames.TryGetValue(usuario.UsuarioId, out var userPlayedGames) &&
                userPlayedGames.Contains(juego.JuegoId));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:fritvers", "Fritvers",
                    "Guanya almenys un joc de 10 categories diferents.", DefaultIconPath,
                    "CategoryWins", winningCategories.GetValueOrDefault(usuario.UsuarioId), 10)));
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:polivalent", "Polivalent",
                    "Guanya partides amb 1, 2, 3, 4, 5 i 6 jugadors.", DefaultIconPath,
                    "PlayerCountWins",
                    winningPlayerCounts.TryGetValue(usuario.UsuarioId, out var playerCounts) ? playerCounts.Count : 0,
                    6)));
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:rodamon-ludic", "Rodamón lúdic",
                    "Guanya 50 jocs diferents, excloent els No llista.", DefaultIconPath,
                    "DistinctGameWins", wonNonListGames, 50)));
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:explorador", "Explorador/a",
                    "Juga 100 jocs diferents, excloent els No llista.", DefaultIconPath,
                    "DistinctGamesPlayed", playedNonListGames, 100)));
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:calendari-frit", "Calendari Frit",
                    "Juga almenys una partida cada mes durant 12 mesos consecutius.", DefaultIconPath,
                    "MonthlyPlayStreak", calendarStreaks.GetValueOrDefault(usuario.UsuarioId), 12)));
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:au-fenix", "Au Fènix",
                    "Torna a guanyar un joc després d'un any sense jugar-lo.", DefaultIconPath,
                    "PhoenixWin", phoenixWins.GetValueOrDefault(usuario.UsuarioId), 1)));
            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildSingleTargetProgress("dynamic:per-poc", "Per poc!",
                    "Guanya 10 partides amb empat a la primera posició.", DefaultIconPath,
                    "TiedFirstWins", tiedFirstWins.GetValueOrDefault(usuario.UsuarioId), 10)));

            foreach (var manual in manualMedallas)
            {
                var completed = manual.Usuarios.Any(row => row.UsuarioId == usuario.UsuarioId);
                rows.Add(new UserMedalProgressRow(
                    usuario.UsuarioId,
                    usuario.Nombre,
                    BuildSingleTargetProgress(
                        $"manual:{manual.ManualMedallaId}",
                        manual.Nombre,
                        manual.Descripcion,
                        string.IsNullOrWhiteSpace(manual.IconPath) ? DefaultIconPath : manual.IconPath,
                        "Manual",
                        completed ? 1 : 0,
                        1)));
            }

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildRankedProgress(
                    "rowing:hero-of-galleys",
                    "Heroi de Galeres",
                    "Acumula punts participant en remades.",
                    DefaultIconPath,
                    "RowingPoints",
                    remadaPoints.GetValueOrDefault(usuario.UsuarioId))));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildWinnerProgress(
                    "cine:total-ratings",
                    "Cinèfil Frit",
                    "Ha vist més pel·lícules que ningú en diumenge.",
                    DefaultIconPath,
                    "CineTotalRatings",
                    cineTotals.GetValueOrDefault(usuario.UsuarioId),
                    cineTotalTarget,
                    false)));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildWinnerProgress(
                    "cine:sunday-streak",
                    "Diumenge infal·lible",
                    "Ratxa de diumenges consecutius veient pel·lícules.",
                    DefaultIconPath,
                    "CineSundayStreak",
                    cineSundayStreaks.GetValueOrDefault(usuario.UsuarioId),
                    cineSundayTarget,
                    true)));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildWinnerProgress(
                    "csopa:sopars-total",
                    "Soparista Frit",
                    "Ha anat a més sopars que ningú.",
                    "/assets/sopar.png",
                    "CsopaSoparTotal",
                    soparTotals.GetValueOrDefault(usuario.UsuarioId),
                    soparTotalTarget,
                    false)));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildWinnerProgress(
                    "csopa:sopars-tuesday-streak",
                    "Dimarts de cullera",
                    "Ratxa de dimarts consecutius anant a sopar.",
                    "/assets/sopar.png",
                    "CsopaSoparTuesdayStreak",
                    soparTuesdayStreaks.GetValueOrDefault(usuario.UsuarioId),
                    soparTuesdayTarget,
                    true)));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildWinnerProgress(
                    "csopa:gymfrit-total",
                    "Gymfriter",
                    "Ha anat a mÃ©s Gymfrits que ningÃº.",
                    "/assets/gymfrit.png",
                    "CsopaGymfritTotal",
                    gymfritTotals.GetValueOrDefault(usuario.UsuarioId),
                    gymfritTotalTarget,
                    false)));

            rows.Add(new UserMedalProgressRow(
                usuario.UsuarioId,
                usuario.Nombre,
                BuildWinnerProgress(
                    "csopa:gymfrit-thursday-streak",
                    "Dijous de ferro",
                    "Ratxa de dijous consecutius anant a Gymfrit.",
                    "/assets/gymfrit.png",
                    "CsopaGymfritThursdayStreak",
                    gymfritThursdayStreaks.GetValueOrDefault(usuario.UsuarioId),
                    gymfritThursdayTarget,
                    true)));
        }

        return rows;
    }

    private static Dictionary<int, int> BuildCineTotalRatingsLookup(List<CinePelicula> peliculas)
    {
        return peliculas
            .Where(pelicula => pelicula.GrupoPelicula == 1 && GetFritDate(pelicula.CreatedAt).DayOfWeek == DayOfWeek.Sunday)
            .SelectMany(pelicula => pelicula.Valoraciones)
            .GroupBy(valoracion => valoracion.UsuarioId)
            .ToDictionary(group => group.Key, group => group.Count());
    }

    private static Dictionary<int, int> BuildCineSundayStreakLookup(
        List<CinePelicula> peliculas,
        List<Usuario> usuarios,
        DateOnly today)
    {
        var peliculasBySunday = peliculas
            .Where(pelicula => pelicula.GrupoPelicula == 1)
            .Select(pelicula => new
            {
                Dia = GetFritDate(pelicula.CreatedAt),
                Pelicula = pelicula
            })
            .Where(row => row.Dia.DayOfWeek == DayOfWeek.Sunday)
            .GroupBy(row => row.Dia)
            .ToDictionary(group => group.Key, group => group.Select(row => row.Pelicula).ToList());
        var latestSunday = GetLatestSunday(today);
        var result = new Dictionary<int, int>();

        foreach (var usuario in usuarios)
        {
            var streak = 0;

            for (var day = latestSunday; ; day = day.AddDays(-7))
            {
                if (!peliculasBySunday.TryGetValue(day, out var sundayMovies))
                {
                    break;
                }

                if (!sundayMovies.Any(pelicula =>
                    pelicula.Valoraciones.Any(valoracion => valoracion.UsuarioId == usuario.UsuarioId)))
                {
                    break;
                }

                streak++;
            }

            result[usuario.UsuarioId] = streak;
        }

        return result;
    }

    private static Dictionary<int, int> BuildCsopaTotalAttendanceLookup(
        List<CsopaActivitat> activitats,
        int tipus)
    {
        return activitats
            .Where(activitat => activitat.Tipus == tipus)
            .SelectMany(activitat => activitat.Assistencies)
            .GroupBy(assistencia => assistencia.UsuarioId)
            .ToDictionary(group => group.Key, group => group.Count());
    }

    private static Dictionary<int, int> BuildCsopaWeekdayStreakLookup(
        List<CsopaActivitat> activitats,
        List<Usuario> usuarios,
        int tipus,
        DayOfWeek weekday,
        DateOnly today)
    {
        var activitatsByDay = activitats
            .Where(activitat => activitat.Tipus == tipus)
            .Select(activitat => new
            {
                Dia = GetFritDate(activitat.CreatedAt),
                Activitat = activitat
            })
            .Where(row => row.Dia.DayOfWeek == weekday)
            .GroupBy(row => row.Dia)
            .ToDictionary(group => group.Key, group => group.Select(row => row.Activitat).ToList());
        var latestDay = GetLatestWeekday(today, weekday);
        var result = new Dictionary<int, int>();

        foreach (var usuario in usuarios)
        {
            var streak = 0;

            for (var day = latestDay; ; day = day.AddDays(-7))
            {
                if (!activitatsByDay.TryGetValue(day, out var dayActivities))
                {
                    break;
                }

                if (!dayActivities.Any(activitat =>
                    activitat.Assistencies.Any(assistencia => assistencia.UsuarioId == usuario.UsuarioId)))
                {
                    break;
                }

                streak++;
            }

            result[usuario.UsuarioId] = streak;
        }

        return result;
    }

    private static Dictionary<(int UsuarioId, int JuegoId), int> BuildWinLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var usuariosById = usuarios.ToDictionary(usuario => usuario.UsuarioId);
        var usuariosRegistrados = usuarios
            .Select(usuario => new RegisteredUserRow(
                usuario.UsuarioId,
                usuario.Nombre,
                NormalizeName(usuario.Nombre)))
            .ToList();
        var wins = new Dictionary<(int UsuarioId, int JuegoId), int>();

        foreach (var partida in partidas)
        {
            foreach (var jugador in partida.Jugadores.Where(jugador => jugador.Posicion == 1))
            {
                var detected = new Dictionary<int, RegisteredUserRow>();
                if (jugador.UsuarioId.HasValue && usuariosById.TryGetValue(jugador.UsuarioId.Value, out var usuarioDirecto))
                {
                    detected[usuarioDirecto.UsuarioId] = new RegisteredUserRow(
                        usuarioDirecto.UsuarioId,
                        usuarioDirecto.Nombre,
                        NormalizeName(usuarioDirecto.Nombre));
                }

                foreach (var usuarioDetectado in MatchUsuariosByNombreMostrado(jugador.NombreMostrado, usuariosRegistrados))
                {
                    detected.TryAdd(usuarioDetectado.UsuarioId, usuarioDetectado);
                }

                foreach (var ganador in detected.Values)
                {
                    var key = (ganador.UsuarioId, partida.JuegoId);
                    wins[key] = wins.GetValueOrDefault(key) + 1;
                }
            }
        }

        return wins;
    }

    private static Dictionary<int, int> BuildPlayCountLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var usuariosById = usuarios.ToDictionary(usuario => usuario.UsuarioId);
        var usuariosRegistrados = usuarios
            .Select(usuario => new RegisteredUserRow(
                usuario.UsuarioId,
                usuario.Nombre,
                NormalizeName(usuario.Nombre)))
            .ToList();
        var playedPartidas = new HashSet<(int UsuarioId, int PartidaId)>();

        foreach (var partida in partidas)
        {
            foreach (var jugador in partida.Jugadores)
            {
                var detected = new Dictionary<int, RegisteredUserRow>();
                if (jugador.UsuarioId.HasValue && usuariosById.TryGetValue(jugador.UsuarioId.Value, out var usuarioDirecto))
                {
                    detected[usuarioDirecto.UsuarioId] = new RegisteredUserRow(
                        usuarioDirecto.UsuarioId,
                        usuarioDirecto.Nombre,
                        NormalizeName(usuarioDirecto.Nombre));
                }

                foreach (var usuarioDetectado in MatchUsuariosByNombreMostrado(jugador.NombreMostrado, usuariosRegistrados))
                {
                    detected.TryAdd(usuarioDetectado.UsuarioId, usuarioDetectado);
                }

                foreach (var jugadorDetectado in detected.Values)
                {
                    playedPartidas.Add((jugadorDetectado.UsuarioId, partida.PartidaId));
                }
            }
        }

        return playedPartidas
            .GroupBy(row => row.UsuarioId)
            .ToDictionary(group => group.Key, group => group.Count());
    }

    private static Dictionary<int, HashSet<int>> BuildPlayedGamesLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var result = new Dictionary<int, HashSet<int>>();

        foreach (var partida in partidas)
        {
            foreach (var usuarioId in DetectParticipantIds(partida, usuarios))
            {
                if (!result.TryGetValue(usuarioId, out var gameIds))
                {
                    gameIds = [];
                    result[usuarioId] = gameIds;
                }

                gameIds.Add(partida.JuegoId);
            }
        }

        return result;
    }

    private static Dictionary<int, HashSet<int>> BuildWinningPlayerCountsLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var result = new Dictionary<int, HashSet<int>>();

        foreach (var partida in partidas.Where(partida =>
            partida.NumeroJugadores >= 1 && partida.NumeroJugadores <= 6))
        {
            foreach (var usuarioId in DetectWinnerIds(partida, usuarios))
            {
                if (!result.TryGetValue(usuarioId, out var playerCounts))
                {
                    playerCounts = [];
                    result[usuarioId] = playerCounts;
                }

                playerCounts.Add(partida.NumeroJugadores);
            }
        }

        return result;
    }

    private static Dictionary<int, int> BuildWinningCategoryCountLookup(
        Dictionary<(int UsuarioId, int JuegoId), int> wins,
        List<Juego> juegos)
    {
        var categoriesByGame = juegos
            .ToDictionary(
                juego => juego.JuegoId,
                juego => SplitGameTypes(juego.Tipo));
        var categoriesByUser = new Dictionary<int, HashSet<string>>();

        foreach (var ((usuarioId, juegoId), winCount) in wins.Where(row => row.Value > 0))
        {
            if (!categoriesByGame.TryGetValue(juegoId, out var categories))
            {
                continue;
            }

            if (!categoriesByUser.TryGetValue(usuarioId, out var userCategories))
            {
                userCategories = new(StringComparer.OrdinalIgnoreCase);
                categoriesByUser[usuarioId] = userCategories;
            }

            userCategories.UnionWith(categories);
        }

        return categoriesByUser.ToDictionary(row => row.Key, row => row.Value.Count);
    }

    private static Dictionary<int, int> BuildMonthlyPlayStreakLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var monthsByUser = new Dictionary<int, HashSet<int>>();

        foreach (var partida in partidas)
        {
            var monthIndex = partida.Fecha.Year * 12 + partida.Fecha.Month;
            foreach (var usuarioId in DetectParticipantIds(partida, usuarios))
            {
                if (!monthsByUser.TryGetValue(usuarioId, out var months))
                {
                    months = [];
                    monthsByUser[usuarioId] = months;
                }

                months.Add(monthIndex);
            }
        }

        return monthsByUser.ToDictionary(row => row.Key, row =>
        {
            var ordered = row.Value.Order().ToList();
            var best = 0;
            var current = 0;
            int? previous = null;

            foreach (var month in ordered)
            {
                current = previous.HasValue && month == previous.Value + 1 ? current + 1 : 1;
                best = Math.Max(best, current);
                previous = month;
            }

            return best;
        });
    }

    private static Dictionary<int, int> BuildPhoenixWinLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var result = new Dictionary<int, int>();

        foreach (var gameGroup in partidas.GroupBy(partida => partida.JuegoId))
        {
            DateOnly? previousDate = null;

            foreach (var partida in gameGroup.OrderBy(partida => partida.Fecha).ThenBy(partida => partida.PartidaId))
            {
                if (previousDate.HasValue && previousDate.Value.AddYears(1) <= partida.Fecha)
                {
                    foreach (var usuarioId in DetectWinnerIds(partida, usuarios))
                    {
                        result[usuarioId] = 1;
                    }
                }

                previousDate = partida.Fecha;
            }
        }

        return result;
    }

    private static Dictionary<int, int> BuildTiedFirstWinLookup(
        List<Partida> partidas,
        List<Usuario> usuarios)
    {
        var result = new Dictionary<int, int>();

        foreach (var partida in partidas.Where(partida =>
            partida.Jugadores.Count(jugador => jugador.Posicion == 1) > 1))
        {
            foreach (var usuarioId in DetectWinnerIds(partida, usuarios))
            {
                result[usuarioId] = result.GetValueOrDefault(usuarioId) + 1;
            }
        }

        return result;
    }

    private static HashSet<int> DetectParticipantIds(Partida partida, List<Usuario> usuarios)
    {
        return DetectUsuarioIds(partida.Jugadores, usuarios);
    }

    private static HashSet<int> DetectWinnerIds(Partida partida, List<Usuario> usuarios)
    {
        return DetectUsuarioIds(
            partida.Jugadores.Where(jugador => jugador.Posicion == 1),
            usuarios);
    }

    private static HashSet<int> DetectUsuarioIds(
        IEnumerable<PartidaJugador> jugadores,
        List<Usuario> usuarios)
    {
        var usuariosById = usuarios.ToDictionary(usuario => usuario.UsuarioId);
        var registeredUsers = usuarios
            .Select(usuario => new RegisteredUserRow(
                usuario.UsuarioId,
                usuario.Nombre,
                NormalizeName(usuario.Nombre)))
            .ToList();
        var result = new HashSet<int>();

        foreach (var jugador in jugadores)
        {
            if (jugador.UsuarioId.HasValue && usuariosById.ContainsKey(jugador.UsuarioId.Value))
            {
                result.Add(jugador.UsuarioId.Value);
            }

            foreach (var usuario in MatchUsuariosByNombreMostrado(jugador.NombreMostrado, registeredUsers))
            {
                result.Add(usuario.UsuarioId);
            }
        }

        return result;
    }

    private static HashSet<string> SplitGameTypes(string? value)
    {
        return (value ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(type => !string.Equals(type, "No llista", StringComparison.OrdinalIgnoreCase))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    private static MedalProgressDto BuildRankedProgress(
        string medalId,
        string nombre,
        string descripcion,
        string iconPath,
        string tipo,
        int currentValue)
    {
        var currentRank = GameWinRanks.LastOrDefault(rank => currentValue >= rank.Threshold);
        var nextRank = GameWinRanks.FirstOrDefault(rank => currentValue < rank.Threshold);
        var target = nextRank?.Threshold ?? GameWinRanks[^1].Threshold;
        var rankLevel = currentRank is null ? 0 : Array.IndexOf(GameWinRanks, currentRank) + 1;

        return new MedalProgressDto
        {
            MedalId = medalId,
            Nombre = nombre,
            Descripcion = descripcion,
            IconPath = iconPath,
            Tipo = tipo,
            CurrentValue = currentValue,
            TargetValue = target,
            RankName = currentRank?.Name ?? "Pendent",
            RankLevel = rankLevel,
            RankTargetValue = currentRank?.Threshold ?? 0,
            RankColor = currentRank?.Color ?? "#98a2b3",
            RankFilled = currentRank?.Filled ?? false,
            NextRankName = nextRank?.Name,
            NextTargetValue = nextRank?.Threshold,
            Completed = currentValue >= GameWinRanks[^1].Threshold,
            EpicScore = rankLevel * 1000 + Math.Min(currentValue, GameWinRanks[^1].Threshold)
        };
    }

    private static MedalProgressDto BuildSingleTargetProgress(
        string medalId,
        string nombre,
        string descripcion,
        string iconPath,
        string tipo,
        int currentValue,
        int targetValue,
        List<MedalGameDto>? games = null)
    {
        var completed = currentValue >= targetValue;

        return new MedalProgressDto
        {
            MedalId = medalId,
            Nombre = nombre,
            Descripcion = descripcion,
            IconPath = iconPath,
            Tipo = tipo,
            CurrentValue = currentValue,
            TargetValue = targetValue,
            RankName = completed ? "Completada" : "Pendent",
            RankLevel = completed ? 5 : 0,
            RankTargetValue = completed ? targetValue : 0,
            RankColor = completed ? "#7c3aed" : "#98a2b3",
            RankFilled = completed,
            NextRankName = completed ? null : "Completada",
            NextTargetValue = completed ? null : targetValue,
            Completed = completed,
            EpicScore = (completed ? 5000 : 0) + currentValue,
            Games = games ?? []
        };
    }

    private static MedalProgressDto BuildWinnerProgress(
        string medalId,
        string nombre,
        string descripcion,
        string iconPath,
        string tipo,
        int currentValue,
        int targetValue,
        bool showValueInHallOfFame)
    {
        var completed = targetValue > 0 && currentValue == targetValue;

        return new MedalProgressDto
        {
            MedalId = medalId,
            Nombre = nombre,
            Descripcion = descripcion,
            IconPath = iconPath,
            Tipo = tipo,
            CurrentValue = currentValue,
            TargetValue = targetValue,
            RankName = completed ? "Llegenda" : "Pendent",
            RankLevel = completed ? 5 : 0,
            RankTargetValue = completed && showValueInHallOfFame ? currentValue : 0,
            RankColor = completed ? "#7c3aed" : "#98a2b3",
            RankFilled = completed,
            NextRankName = completed ? null : "Llegenda",
            NextTargetValue = completed ? null : targetValue,
            Completed = completed,
            EpicScore = (completed ? 5000 : 0) + currentValue
        };
    }

    private static DateOnly GetLatestSunday(DateOnly today)
    {
        var daysSinceSunday = (int)today.DayOfWeek;
        return today.AddDays(-daysSinceSunday);
    }

    private static DateOnly GetLatestWeekday(DateOnly today, DayOfWeek weekday)
    {
        var daysSinceWeekday = ((int)today.DayOfWeek - (int)weekday + 7) % 7;
        return today.AddDays(-daysSinceWeekday);
    }

    private static DateOnly GetFritToday(DateTime utcNow)
    {
        return DateOnly.FromDateTime(ConvertFromUtcToFritTime(utcNow));
    }

    private static DateOnly GetFritDate(DateTime value)
    {
        return DateOnly.FromDateTime(ConvertFromUtcToFritTime(value));
    }

    private static DateTime ConvertFromUtcToFritTime(DateTime value)
    {
        var utcValue = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        return TimeZoneInfo.ConvertTimeFromUtc(utcValue, GetFritTimeZone());
    }

    private static TimeZoneInfo GetFritTimeZone()
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

    private static IEnumerable<RegisteredUserRow> MatchUsuariosByNombreMostrado(
        string nombreMostrado,
        List<RegisteredUserRow> usuariosRegistrados)
    {
        var nombres = SplitDisplayedNames(nombreMostrado);
        return nombres.Count == 0
            ? []
            : usuariosRegistrados.Where(usuario => nombres.Contains(usuario.NormalizedNombre));
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

    private static bool IsExternalUser(Usuario usuario)
    {
        return usuario.UsuarioId == ExternalUserPolicy.ExternalUserId ||
            usuario.Nombre == ExternalUserPolicy.ExternalUserName;
    }

    private static bool ShouldShowInHallOfFame(MedalProgressDto progress)
    {
        return progress.Tipo switch
        {
            "GameWins" => progress.CurrentValue > 0,
            "GameSetWins" or "HeavyBggWins" or "TotalPlays" or
                "CategoryWins" or "PlayerCountWins" or "DistinctGameWins" or
                "DistinctGamesPlayed" or "MonthlyPlayStreak" or "PhoenixWin" or
                "TiedFirstWins" or
                "CineTotalRatings" or "CineSundayStreak" or
                "CsopaSoparTotal" or "CsopaSoparTuesdayStreak" or
                "CsopaGymfritTotal" or "CsopaGymfritThursdayStreak" => progress.Completed,
            _ => progress.CurrentValue > 0
        };
    }

    private static string GetHallOfFameEntryKey(MedalProgressDto progress)
    {
        return progress.Tipo == "GameWins"
            ? $"{progress.MedalId}:rank:{progress.RankLevel}"
            : progress.MedalId;
    }

    private static string GetGameIconPath(int juegoId)
    {
        return $"/assets/medallas/jocs/{juegoId}.png";
    }

    private static bool ContainsGameType(string? value, string type)
    {
        return (value ?? string.Empty).Contains(type, StringComparison.OrdinalIgnoreCase);
    }

    private sealed record MedalRank(string Name, int Threshold, string Color, bool Filled);
    private sealed record CodedSetMedal(string MedalId, string Nombre, string Descripcion, int[] JuegoIds);
    private sealed record ThresholdSetMedal(
        string MedalId,
        string Nombre,
        string Descripcion,
        int TargetValue,
        int[] JuegoIds);
    private sealed record DynamicMedal(string MedalId, string Nombre, string Descripcion, string Tipo, int TargetValue);
    private sealed record RegisteredUserRow(int UsuarioId, string Nombre, string NormalizedNombre);
    private sealed record UserMedalProgressRow(int UsuarioId, string UsuarioNombre, MedalProgressDto Progress);
}
