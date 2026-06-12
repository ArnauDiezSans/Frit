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
            "set:1-2-3",
            "Triple corona",
            "Guanya almenys una partida als jocs 1, 2 i 3.",
            [1, 2, 3])
    ];

    public HallOfFameService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<HallOfFameDto> GetHallOfFameAsync(string? currentUserName)
    {
        var progress = await BuildAllProgressAsync();
        var entries = progress
            .Where(row => row.Progress.CurrentValue > 0)
            .GroupBy(row => row.Progress.MedalId)
            .Select(group =>
            {
                var best = group
                    .OrderByDescending(row => row.Progress.RankLevel)
                    .ThenByDescending(row => row.Progress.CurrentValue)
                    .ThenBy(row => row.UsuarioNombre)
                    .First();

                return new HallOfFameEntryDto
                {
                    Medal = best.Progress,
                    BestUser = new MedalUserProgressDto
                    {
                        UsuarioId = best.UsuarioId,
                        UsuarioNombre = best.UsuarioNombre,
                        CurrentValue = best.Progress.CurrentValue,
                        RankName = best.Progress.RankName,
                        RankLevel = best.Progress.RankLevel
                    }
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

        var wins = BuildWinLookup(partidas, usuarios);
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
                        medal.JuegoIds.Length)));
            }

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
        }

        return rows;
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
        int targetValue)
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
            RankColor = completed ? "#7c3aed" : "#98a2b3",
            RankFilled = completed,
            NextRankName = completed ? null : "Completada",
            NextTargetValue = completed ? null : targetValue,
            Completed = completed,
            EpicScore = (completed ? 5000 : 0) + currentValue
        };
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

    private static string GetGameIconPath(int juegoId)
    {
        return $"/assets/medallas/jocs/{juegoId}.png";
    }

    private sealed record MedalRank(string Name, int Threshold, string Color, bool Filled);
    private sealed record CodedSetMedal(string MedalId, string Nombre, string Descripcion, int[] JuegoIds);
    private sealed record RegisteredUserRow(int UsuarioId, string Nombre, string NormalizedNombre);
    private sealed record UserMedalProgressRow(int UsuarioId, string UsuarioNombre, MedalProgressDto Progress);
}
