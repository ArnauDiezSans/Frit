using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public sealed class JuegoProgresoService(AppDbContext context)
{
    public async Task<(List<JuegoProgresoNivelDto>? Value, string? Error)> GetLevelsAsync(int juegoId)
    {
        var error = await ValidateGameAsync(juegoId);
        if (error is not null) return (null, error);

        var levels = await context.JuegoProgresoNiveles.AsNoTracking()
            .Where(level => level.JuegoId == juegoId)
            .OrderBy(level => level.Orden)
            .ThenBy(level => level.JuegoProgresoNivelId)
            .Select(level => new JuegoProgresoNivelDto(level.JuegoProgresoNivelId, level.Nombre, level.Orden))
            .ToListAsync();
        return (levels, null);
    }

    public async Task<(JuegoProgresoDto? Value, string? Error)> GetAsync(int juegoId)
    {
        var juego = await context.Juegos.FirstOrDefaultAsync(j => j.JuegoId == juegoId);
        if (juego is null) return (null, "Joc no trobat.");
        if (!juego.TieneProgresoNiveles) return (null, "Aquest joc no té activat el progrés de nivells.");

        var existingUserIds = await context.JuegoProgresoJugadores.Where(row => row.JuegoId == juegoId && row.UsuarioId != null)
            .Select(row => row.UsuarioId!.Value).ToListAsync();
        var users = await context.Usuarios.AsNoTracking().Where(u => !u.EsUsuarioExterno && !existingUserIds.Contains(u.UsuarioId))
            .OrderBy(u => u.Nombre).Select(u => new { u.UsuarioId, u.Nombre }).ToListAsync();
        var nextOrder = await context.JuegoProgresoJugadores.Where(row => row.JuegoId == juegoId)
            .Select(row => (int?)row.Orden).MaxAsync() ?? -1;
        foreach (var user in users)
            context.JuegoProgresoJugadores.Add(new JuegoProgresoJugador
                { JuegoId = juegoId, UsuarioId = user.UsuarioId, Nombre = user.Nombre, Orden = ++nextOrder });
        if (users.Count > 0) await context.SaveChangesAsync();

        return (await BuildAsync(juego), null);
    }

    public async Task<(JuegoProgresoJugadorDto? Value, string? Error)> AddVisitorAsync(int juegoId, string nombre)
    {
        var error = await ValidateGameAsync(juegoId);
        if (error is not null) return (null, error);
        nombre = nombre.Trim();
        if (nombre.Length is < 1 or > 200) return (null, "El nom de la visita ha de tenir entre 1 i 200 caràcters.");
        var order = (await context.JuegoProgresoJugadores.Where(row => row.JuegoId == juegoId)
            .Select(row => (int?)row.Orden).MaxAsync() ?? -1) + 1;
        var row = new JuegoProgresoJugador { JuegoId = juegoId, Nombre = nombre, EsVisita = true, Orden = order };
        context.JuegoProgresoJugadores.Add(row);
        await context.SaveChangesAsync();
        return (ToDto(row), null);
    }

    public async Task<string?> DeleteVisitorAsync(int juegoId, int jugadorId)
    {
        var row = await context.JuegoProgresoJugadores.FirstOrDefaultAsync(item => item.JuegoId == juegoId && item.JuegoProgresoJugadorId == jugadorId);
        if (row is null) return "Participant no trobat.";
        if (!row.EsVisita) return "Els usuaris del grup no es poden eliminar del progrés.";
        context.JuegoProgresoJugadores.Remove(row);
        await context.SaveChangesAsync();
        return null;
    }

    public async Task<(JuegoProgresoNivelDto? Value, string? Error)> AddLevelAsync(int juegoId, string nombre)
    {
        var error = await ValidateGameAsync(juegoId);
        if (error is not null) return (null, error);
        nombre = nombre.Trim();
        if (nombre.Length is < 1 or > 300) return (null, "El nivell ha de tenir entre 1 i 300 caràcters.");
        var order = (await context.JuegoProgresoNiveles.Where(level => level.JuegoId == juegoId)
            .Select(level => (int?)level.Orden).MaxAsync() ?? -1) + 1;
        var level = new JuegoProgresoNivel { JuegoId = juegoId, Nombre = nombre, Orden = order };
        context.JuegoProgresoNiveles.Add(level);
        await context.SaveChangesAsync();
        return (ToDto(level), null);
    }

    public async Task<(JuegoProgresoNivelDto? Value, string? Error)> RenameLevelAsync(int juegoId, int nivelId, string nombre)
    {
        var level = await context.JuegoProgresoNiveles.FirstOrDefaultAsync(item => item.JuegoId == juegoId && item.JuegoProgresoNivelId == nivelId);
        if (level is null) return (null, "Nivell no trobat.");
        nombre = nombre.Trim();
        if (nombre.Length is < 1 or > 300) return (null, "El nivell ha de tenir entre 1 i 300 caràcters.");
        level.Nombre = nombre;
        await context.SaveChangesAsync();
        return (ToDto(level), null);
    }

    public async Task<string?> DeleteLevelAsync(int juegoId, int nivelId)
    {
        var level = await context.JuegoProgresoNiveles.FirstOrDefaultAsync(item => item.JuegoId == juegoId && item.JuegoProgresoNivelId == nivelId);
        if (level is null) return "Nivell no trobat.";
        context.JuegoProgresoNiveles.Remove(level);
        await context.SaveChangesAsync();
        return null;
    }

    public async Task<string?> ReorderLevelsAsync(int juegoId, IReadOnlyList<int> ids)
    {
        var levels = await context.JuegoProgresoNiveles.Where(level => level.JuegoId == juegoId).ToListAsync();
        if (ids.Count != levels.Count || ids.Distinct().Count() != ids.Count || levels.Any(level => !ids.Contains(level.JuegoProgresoNivelId)))
            return "L’ordre dels nivells no és vàlid.";
        for (var index = 0; index < ids.Count; index++) levels.Single(level => level.JuegoProgresoNivelId == ids[index]).Orden = index;
        await context.SaveChangesAsync();
        return null;
    }

    public async Task<string?> SetMarkAsync(int juegoId, JuegoProgresoMarcaWriteDto dto)
    {
        var rowExists = await context.JuegoProgresoJugadores.AnyAsync(row => row.JuegoId == juegoId && row.JuegoProgresoJugadorId == dto.JuegoProgresoJugadorId);
        var levelExists = await context.JuegoProgresoNiveles.AnyAsync(level => level.JuegoId == juegoId && level.JuegoProgresoNivelId == dto.JuegoProgresoNivelId);
        if (!rowExists || !levelExists) return "La casella seleccionada no és vàlida.";
        var mark = await context.JuegoProgresoMarcas.FirstOrDefaultAsync(item => item.JuegoProgresoJugadorId == dto.JuegoProgresoJugadorId && item.JuegoProgresoNivelId == dto.JuegoProgresoNivelId);
        if (dto.Assolit && mark is null) context.JuegoProgresoMarcas.Add(new JuegoProgresoMarca { JuegoProgresoJugadorId = dto.JuegoProgresoJugadorId, JuegoProgresoNivelId = dto.JuegoProgresoNivelId });
        else if (!dto.Assolit && mark is not null) context.JuegoProgresoMarcas.Remove(mark);
        await context.SaveChangesAsync();
        return null;
    }

    public async Task<string?> ApplyPartidaProgressAsync(int partidaId, PartidaProgresoWriteDto dto)
    {
        var partida = await context.Partidas.AsNoTracking()
            .Where(item => item.PartidaId == partidaId)
            .Select(item => new { item.JuegoId, item.Juego.TieneProgresoNiveles })
            .FirstOrDefaultAsync();
        if (partida is null) return "Partida no trobada.";
        if (!partida.TieneProgresoNiveles) return "Aquest joc no té activat el progrés de nivells.";

        var selections = (dto.Jugadores ?? [])
            .GroupBy(item => item.PartidaJugadorId)
            .ToDictionary(group => group.Key, group => group.SelectMany(item => item.NivelIds ?? []).Distinct().ToList());
        if (selections.Count == 0 || selections.Values.All(ids => ids.Count == 0)) return null;

        var partidaPlayers = await context.PartidaJugadores.AsNoTracking()
            .Where(player => player.PartidaId == partidaId && selections.Keys.Contains(player.PartidaJugadorId))
            .Select(player => new { player.PartidaJugadorId, player.UsuarioId, player.NombreMostrado })
            .ToListAsync();
        if (partidaPlayers.Count != selections.Count) return "Hi ha jugadors seleccionats que no pertanyen a la partida.";

        var levelIds = selections.Values.SelectMany(ids => ids).Distinct().ToList();
        var validLevelIds = await context.JuegoProgresoNiveles.AsNoTracking()
            .Where(level => level.JuegoId == partida.JuegoId && levelIds.Contains(level.JuegoProgresoNivelId))
            .Select(level => level.JuegoProgresoNivelId)
            .ToListAsync();
        if (validLevelIds.Count != levelIds.Count) return "Hi ha nivells seleccionats que no pertanyen al joc de la partida.";

        var progressPlayers = await context.JuegoProgresoJugadores
            .Where(row => row.JuegoId == partida.JuegoId)
            .ToListAsync();
        var nextOrder = progressPlayers.Select(row => (int?)row.Orden).Max() ?? -1;
        var pendingMarks = new List<(JuegoProgresoJugador Player, int LevelId)>();

        foreach (var partidaPlayer in partidaPlayers)
        {
            var progressPlayer = partidaPlayer.UsuarioId.HasValue
                ? progressPlayers.FirstOrDefault(row => row.UsuarioId == partidaPlayer.UsuarioId)
                : progressPlayers.FirstOrDefault(row => row.EsVisita &&
                    string.Equals(row.Nombre.Trim(), partidaPlayer.NombreMostrado.Trim(), StringComparison.OrdinalIgnoreCase));

            if (progressPlayer is null)
            {
                progressPlayer = new JuegoProgresoJugador
                {
                    JuegoId = partida.JuegoId,
                    UsuarioId = partidaPlayer.UsuarioId,
                    Nombre = partidaPlayer.NombreMostrado.Trim(),
                    EsVisita = !partidaPlayer.UsuarioId.HasValue,
                    Orden = ++nextOrder
                };
                context.JuegoProgresoJugadores.Add(progressPlayer);
                progressPlayers.Add(progressPlayer);
            }

            foreach (var levelId in selections[partidaPlayer.PartidaJugadorId])
                pendingMarks.Add((progressPlayer, levelId));
        }

        await context.SaveChangesAsync();

        var progressPlayerIds = pendingMarks.Select(item => item.Player.JuegoProgresoJugadorId).Distinct().ToList();
        var existingMarks = await context.JuegoProgresoMarcas.AsNoTracking()
            .Where(mark => progressPlayerIds.Contains(mark.JuegoProgresoJugadorId) && levelIds.Contains(mark.JuegoProgresoNivelId))
            .Select(mark => new { mark.JuegoProgresoJugadorId, mark.JuegoProgresoNivelId })
            .ToListAsync();
        var existingKeys = existingMarks.Select(mark => (mark.JuegoProgresoJugadorId, mark.JuegoProgresoNivelId)).ToHashSet();

        foreach (var (player, levelId) in pendingMarks.DistinctBy(item => (item.Player.JuegoProgresoJugadorId, item.LevelId)))
        {
            if (!existingKeys.Contains((player.JuegoProgresoJugadorId, levelId)))
                context.JuegoProgresoMarcas.Add(new JuegoProgresoMarca
                {
                    JuegoProgresoJugadorId = player.JuegoProgresoJugadorId,
                    JuegoProgresoNivelId = levelId
                });
        }

        await context.SaveChangesAsync();
        return null;
    }

    private async Task<string?> ValidateGameAsync(int juegoId)
    {
        var game = await context.Juegos.AsNoTracking().Where(j => j.JuegoId == juegoId)
            .Select(j => new { j.TieneProgresoNiveles }).FirstOrDefaultAsync();
        return game is null ? "Joc no trobat." : !game.TieneProgresoNiveles ? "Aquest joc no té activat el progrés de nivells." : null;
    }

    private async Task<JuegoProgresoDto> BuildAsync(Juego juego)
    {
        var rows = await context.JuegoProgresoJugadores.AsNoTracking().Where(row => row.JuegoId == juego.JuegoId).OrderBy(row => row.Orden).ThenBy(row => row.Nombre).ToListAsync();
        var levels = await context.JuegoProgresoNiveles.AsNoTracking().Where(level => level.JuegoId == juego.JuegoId).OrderBy(level => level.Orden).ToListAsync();
        var rowIds = rows.Select(row => row.JuegoProgresoJugadorId).ToList();
        var marks = await context.JuegoProgresoMarcas.AsNoTracking().Where(mark => rowIds.Contains(mark.JuegoProgresoJugadorId))
            .Select(mark => new JuegoProgresoMarcaDto(mark.JuegoProgresoJugadorId, mark.JuegoProgresoNivelId)).ToListAsync();
        return new JuegoProgresoDto(juego.JuegoId, juego.Nombre, rows.Select(ToDto).ToList(), levels.Select(ToDto).ToList(), marks);
    }

    private static JuegoProgresoJugadorDto ToDto(JuegoProgresoJugador row) => new(row.JuegoProgresoJugadorId, row.UsuarioId, row.Nombre, row.EsVisita, row.Orden);
    private static JuegoProgresoNivelDto ToDto(JuegoProgresoNivel level) => new(level.JuegoProgresoNivelId, level.Nombre, level.Orden);
}
