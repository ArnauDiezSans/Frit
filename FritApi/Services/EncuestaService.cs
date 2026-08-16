using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public sealed class EncuestaService(AppDbContext context, PushNotificationService pushNotifications)
{
    public async Task<List<EncuestaResumenDto>> GetAllAsync(int userId, bool isAdmin)
    {
        var now = DateTime.UtcNow;
        var rows = await context.Encuestas.AsNoTracking()
            .Include(e => e.UsuarioCreador)
            .Include(e => e.Destinatarios)
            .Include(e => e.Respuestas)
            .Where(e => (isAdmin || e.UsuarioCreadorId == userId || e.Estado != EncuestaEstado.Borrador) &&
                        (isAdmin || e.UsuarioCreadorId == userId || e.Destinatarios.Count == 0 || e.Destinatarios.Any(d => d.UsuarioId == userId)))
            .OrderByDescending(e => e.Estado == EncuestaEstado.Publicada)
            .ThenByDescending(e => e.CreatedAt)
            .ToListAsync();
        var activeUsers = await context.Usuarios.AsNoTracking().CountAsync(u => !u.EsUsuarioExterno);
        return rows.Select(e => ToSummary(e, userId, isAdmin, activeUsers, now)).ToList();
    }

    public async Task<EncuestaDetalleDto?> GetAsync(int id, int userId, bool isAdmin)
    {
        var encuesta = await FullQuery().AsNoTracking().FirstOrDefaultAsync(e => e.EncuestaId == id);
        var canManage = encuesta is not null && (isAdmin || encuesta.UsuarioCreadorId == userId);
        if (encuesta is null || (!canManage && encuesta.Estado == EncuestaEstado.Borrador) ||
            (!canManage && encuesta.Destinatarios.Count > 0 && encuesta.Destinatarios.All(d => d.UsuarioId != userId))) return null;

        var activeUsers = await context.Usuarios.AsNoTracking().CountAsync(u => !u.EsUsuarioExterno);
        var mine = encuesta.Respuestas.FirstOrDefault(r => r.UsuarioId == userId);
        var effectiveClosed = IsClosed(encuesta);
        var canSeeResults = encuesta.EsVotacion
            ? effectiveClosed
            : canManage ||
              encuesta.VisibilidadResultados == EncuestaVisibilidadResultados.Siempre ||
              encuesta.VisibilidadResultados == EncuestaVisibilidadResultados.DespuesDeResponder && mine is not null ||
              encuesta.VisibilidadResultados == EncuestaVisibilidadResultados.AlCerrar && effectiveClosed;
        var pending = canManage ? await GetPendingNamesAsync(encuesta) : null;
        return new EncuestaDetalleDto(
            ToSummary(encuesta, userId, isAdmin, activeUsers, DateTime.UtcNow),
            encuesta.PermiteEditarRespuesta,
            encuesta.VisibilidadResultados,
            encuesta.Preguntas.OrderBy(q => q.Orden).Select(ToQuestion).ToList(),
            mine?.Valores.Select(v => new EncuestaRespuestaValorDto(v.EncuestaPreguntaId, v.Texto, v.Numero,
                v.Opciones.Select(o => o.EncuestaOpcionId).ToList())).ToList(),
            canSeeResults ? BuildResults(encuesta) : null,
            pending,
            canManage ? encuesta.Destinatarios.Select(d => d.UsuarioId).ToList() : null);
    }

    public async Task<(bool Success, string? Error, int Id)> CreateAsync(int userId, EncuestaWriteDto dto)
    {
        var error = await ValidateAsync(dto);
        if (error is not null) return (false, error, 0);
        var encuesta = new Encuesta { UsuarioCreadorId = userId, Estado = EncuestaEstado.Borrador };
        Apply(encuesta, dto);
        context.Encuestas.Add(encuesta);
        await context.SaveChangesAsync();
        return (true, null, encuesta.EncuestaId);
    }

    public async Task<(bool Success, string? Error)> UpdateAsync(int id, int actorId, bool isAdmin, EncuestaWriteDto dto)
    {
        var encuesta = await context.Encuestas.Include(e => e.Preguntas).ThenInclude(q => q.Opciones)
            .Include(e => e.Destinatarios).FirstOrDefaultAsync(e => e.EncuestaId == id);
        if (encuesta is null) return (false, "Enquesta no trobada.");
        if (!isAdmin && encuesta.UsuarioCreadorId != actorId) return (false, "No pots gestionar una enquesta creada per un altre usuari.");
        if (encuesta.Estado != EncuestaEstado.Borrador) return (false, "Només es poden editar els esborranys.");
        var error = await ValidateAsync(dto);
        if (error is not null) return (false, error);
        context.EncuestaPreguntas.RemoveRange(encuesta.Preguntas);
        context.EncuestaDestinatarios.RemoveRange(encuesta.Destinatarios);
        encuesta.Preguntas.Clear();
        encuesta.Destinatarios.Clear();
        Apply(encuesta, dto);
        await context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> PublishAsync(int id, int actorId, bool isAdmin)
    {
        var encuesta = await context.Encuestas.Include(e => e.Preguntas).Include(e => e.Destinatarios)
            .FirstOrDefaultAsync(e => e.EncuestaId == id);
        if (encuesta is null) return (false, "Enquesta no trobada.");
        if (!isAdmin && encuesta.UsuarioCreadorId != actorId) return (false, "No pots gestionar una enquesta creada per un altre usuari.");
        if (encuesta.Estado != EncuestaEstado.Borrador) return (false, "L’enquesta ja s’ha publicat.");
        if (encuesta.Preguntas.Count == 0) return (false, "L’enquesta no té preguntes.");
        encuesta.Estado = EncuestaEstado.Publicada;
        encuesta.PublicadaAt = DateTime.UtcNow;
        encuesta.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        var url = encuesta.EsVotacion
            ? $"/app/enquestes?vista=votacions&enquestaId={id}"
            : $"/app/enquestes?vista=enquestes&enquestaId={id}";
        if (encuesta.EsVotacion)
            await pushNotifications.SendPollAsync(actorId, encuesta.Titulo, url);
        else
            await pushNotifications.SendSurveyAsync(actorId, encuesta.Titulo, url,
                encuesta.Destinatarios.Select(d => d.UsuarioId).ToList());
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> CloseAsync(int id, int actorId, bool isAdmin)
    {
        var encuesta = await context.Encuestas.Include(e => e.Respuestas).FirstOrDefaultAsync(e => e.EncuestaId == id);
        if (encuesta is null) return (false, "Enquesta no trobada.");
        if (!isAdmin && encuesta.UsuarioCreadorId != actorId) return (false, "No pots gestionar una enquesta creada per un altre usuari.");
        encuesta.Estado = EncuestaEstado.Cerrada;
        encuesta.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(int id, int actorId, bool isAdmin)
    {
        var encuesta = await context.Encuestas.Include(e => e.Respuestas).FirstOrDefaultAsync(e => e.EncuestaId == id);
        if (encuesta is null) return (false, "Enquesta no trobada.");
        if (!isAdmin && encuesta.UsuarioCreadorId != actorId) return (false, "No pots gestionar una enquesta creada per un altre usuari.");
        if (encuesta.Estado != EncuestaEstado.Borrador && (!encuesta.EsVotacion || encuesta.Respuestas.Count > 0))
            return (false, "Només es poden eliminar els esborranys o les votacions sense vots.");
        context.Encuestas.Remove(encuesta);
        await context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error)> SubmitAsync(int id, int userId, EncuestaSubmitDto dto)
    {
        var encuesta = await FullQuery().FirstOrDefaultAsync(e => e.EncuestaId == id);
        if (encuesta is null) return (false, "Enquesta no trobada.");
        if (encuesta.Estado != EncuestaEstado.Publicada || IsClosed(encuesta)) return (false, "L’enquesta està tancada.");
        if (encuesta.Destinatarios.Count > 0 && encuesta.Destinatarios.All(d => d.UsuarioId != userId))
            return (false, "No ets destinatari d’aquesta enquesta.");
        var existing = encuesta.Respuestas.FirstOrDefault(r => r.UsuarioId == userId);
        if (existing is not null && !encuesta.PermiteEditarRespuesta) return (false, "La resposta ja no es pot editar.");

        var error = ValidateAnswers(encuesta, dto);
        if (error is not null) return (false, error);
        var response = existing ?? new EncuestaRespuesta { EncuestaId = id, UsuarioId = userId };
        if (existing is not null)
        {
            context.EncuestaRespuestaValores.RemoveRange(existing.Valores);
            response.Valores.Clear();
            response.UpdatedAt = DateTime.UtcNow;
        }
        foreach (var answer in dto.Respuestas)
        {
            if (string.IsNullOrWhiteSpace(answer.Texto) && answer.Numero is null && answer.OpcionIds.Count == 0) continue;
            var value = new EncuestaRespuestaValor { EncuestaPreguntaId = answer.EncuestaPreguntaId,
                Texto = answer.Texto?.Trim(), Numero = answer.Numero };
            foreach (var optionId in answer.OpcionIds.Distinct())
                value.Opciones.Add(new EncuestaRespuestaOpcion { EncuestaOpcionId = optionId });
            response.Valores.Add(value);
        }
        if (existing is null) context.EncuestaRespuestas.Add(response);
        await context.SaveChangesAsync();
        return (true, null);
    }

    public async Task<(bool Success, string? Error, int Count)> RemindAsync(int id, int actorId, bool isAdmin)
    {
        var encuesta = await context.Encuestas.AsNoTracking().Include(e => e.Destinatarios).Include(e => e.Respuestas)
            .FirstOrDefaultAsync(e => e.EncuestaId == id);
        if (encuesta is null) return (false, "Enquesta no trobada.", 0);
        if (!isAdmin && encuesta.UsuarioCreadorId != actorId) return (false, "No pots gestionar una enquesta creada per un altre usuari.", 0);
        if (encuesta.Estado != EncuestaEstado.Publicada || IsClosed(encuesta)) return (false, "L’enquesta no està oberta.", 0);
        var targetIds = encuesta.Destinatarios.Count > 0
            ? encuesta.Destinatarios.Select(d => d.UsuarioId).ToList()
            : await context.Usuarios.AsNoTracking().Where(u => !u.EsUsuarioExterno).Select(u => u.UsuarioId).ToListAsync();
        var answered = encuesta.Respuestas.Select(r => r.UsuarioId).ToHashSet();
        var pending = targetIds.Where(idValue => !answered.Contains(idValue) && idValue != actorId).ToList();
        await pushNotifications.SendSurveyReminderAsync(encuesta.Titulo, $"/app/enquestes?enquestaId={id}", pending);
        return (true, null, pending.Count);
    }

    private IQueryable<Encuesta> FullQuery() => context.Encuestas
        .Include(e => e.UsuarioCreador).Include(e => e.Destinatarios).ThenInclude(d => d.Usuario)
        .Include(e => e.Preguntas).ThenInclude(q => q.Opciones)
        .Include(e => e.Respuestas).ThenInclude(r => r.Usuario)
        .Include(e => e.Respuestas).ThenInclude(r => r.Valores).ThenInclude(v => v.Opciones);

    private async Task<string?> ValidateAsync(EncuestaWriteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Titulo) || dto.Titulo.Trim().Length > 200) return "El títol és obligatori i no pot superar 200 caràcters.";
        if (dto.Preguntas.Count is < 1 or > 30) return "L’enquesta ha de tenir entre 1 i 30 preguntes.";
        if (dto.FechaCierre is not null && dto.FechaCierre <= DateTime.UtcNow) return "La data de tancament ha de ser futura.";
        if (dto.DestinatarioIds.Count != dto.DestinatarioIds.Distinct().Count()) return "Hi ha destinataris repetits.";
        if (dto.DestinatarioIds.Count > 0 && await context.Usuarios.CountAsync(u => dto.DestinatarioIds.Contains(u.UsuarioId) && !u.EsUsuarioExterno) != dto.DestinatarioIds.Count)
            return "Hi ha destinataris no vàlids.";
        if (dto.EsVotacion)
        {
            if (dto.Preguntas.Count != 1) return "Una votació ha de tenir una sola pregunta.";
            var pollQuestion = dto.Preguntas[0];
            if (pollQuestion.Tipo is not (EncuestaPreguntaTipo.OpcionUnica or EncuestaPreguntaTipo.OpcionMultiple))
                return "Una votació ha de ser d'opció única o múltiple.";
            if (pollQuestion.Opciones.Count is < 2 or > 6) return "Una votació necessita entre 2 i 6 respostes.";
            if (dto.FechaCierre is null) return "Selecciona la durada de la votació.";
            if (dto.VisibilidadResultados != EncuestaVisibilidadResultados.AlCerrar)
                return "Els resultats d'una votació només es mostren quan es tanca.";
            if (dto.DestinatarioIds.Count > 0) return "Les votacions estan obertes a tot el grup.";
        }
        foreach (var (q, questionIndex) in dto.Preguntas.Select((value, index) => (value, index)))
        {
            if (string.IsNullOrWhiteSpace(q.Texto) || q.Texto.Trim().Length > 500) return "Totes les preguntes necessiten un text vàlid.";
            if (q.Tipo is EncuestaPreguntaTipo.OpcionUnica or EncuestaPreguntaTipo.OpcionMultiple &&
                (q.Opciones.Count is < 2 or > 20 || q.Opciones.Any(o => string.IsNullOrWhiteSpace(o)))) return "Les preguntes d’opcions necessiten entre 2 i 20 opcions.";
            if (q.Tipo == EncuestaPreguntaTipo.Escala && (q.Minimo is null || q.Maximo is null || q.Minimo >= q.Maximo || q.Maximo - q.Minimo > 20))
                return "Les escales necessiten un mínim i un màxim vàlids.";
            if (q.CondicionPreguntaOrden is not null)
            {
                if (q.CondicionPreguntaOrden < 0 || q.CondicionPreguntaOrden >= questionIndex || q.CondicionOpcionOrden is null)
                    return "Una condició només pot dependre d’una pregunta anterior.";
                var source = dto.Preguntas[q.CondicionPreguntaOrden.Value];
                if (source.Tipo is not (EncuestaPreguntaTipo.OpcionUnica or EncuestaPreguntaTipo.OpcionMultiple) ||
                    q.CondicionOpcionOrden < 0 || q.CondicionOpcionOrden >= source.Opciones.Count)
                    return "La pregunta o l’opció de la condició no és vàlida.";
            }
            else if (q.CondicionOpcionOrden is not null) return "La condició de la pregunta és incompleta.";
        }
        return null;
    }

    private static string? ValidateAnswers(Encuesta encuesta, EncuestaSubmitDto dto)
    {
        if (dto.Respuestas.Select(r => r.EncuestaPreguntaId).Distinct().Count() != dto.Respuestas.Count) return "Hi ha respostes duplicades.";
        if (dto.Respuestas.Any(r => encuesta.Preguntas.All(q => q.EncuestaPreguntaId != r.EncuestaPreguntaId))) return "Hi ha una resposta que no pertany a l’enquesta.";
        foreach (var q in encuesta.Preguntas.OrderBy(question => question.Orden))
        {
            var a = dto.Respuestas.FirstOrDefault(r => r.EncuestaPreguntaId == q.EncuestaPreguntaId);
            var visible = IsQuestionVisible(encuesta, q, dto.Respuestas);
            var hasValue = a is not null && (!string.IsNullOrWhiteSpace(a.Texto) || a.Numero is not null || a.OpcionIds.Count > 0);
            if (!visible)
            {
                if (hasValue) return $"La pregunta «{q.Texto}» no correspon al recorregut seleccionat.";
                continue;
            }
            if (q.Obligatoria && !hasValue) return $"La pregunta «{q.Texto}» és obligatòria.";
            if (!hasValue) continue;
            if (a!.Texto?.Length > 4000) return "Una resposta de text és massa llarga.";
            if (q.Tipo is EncuestaPreguntaTipo.TextoCorto or EncuestaPreguntaTipo.TextoLargo && (a.Numero is not null || a.OpcionIds.Count > 0)) return "El format d’una resposta de text no és vàlid.";
            if (q.Tipo == EncuestaPreguntaTipo.OpcionUnica && a.OpcionIds.Count != 1) return $"Selecciona una opció a «{q.Texto}».";
            if (q.Tipo == EncuestaPreguntaTipo.OpcionMultiple && a.OpcionIds.Count < 1) return $"Selecciona almenys una opció a «{q.Texto}».";
            if (q.Tipo is EncuestaPreguntaTipo.OpcionUnica or EncuestaPreguntaTipo.OpcionMultiple && (!string.IsNullOrWhiteSpace(a.Texto) || a.Numero is not null)) return "El format d’una selecció no és vàlid.";
            if (a.OpcionIds.Any(id => q.Opciones.All(o => o.EncuestaOpcionId != id))) return "S’ha seleccionat una opció no vàlida.";
            if (q.Tipo == EncuestaPreguntaTipo.Escala && (a.Numero < q.Minimo || a.Numero > q.Maximo)) return $"El valor de «{q.Texto}» està fora de rang.";
            if (q.Tipo == EncuestaPreguntaTipo.Escala && (!string.IsNullOrWhiteSpace(a.Texto) || a.OpcionIds.Count > 0)) return "El format d’una escala no és vàlid.";
        }
        return null;
    }

    private static void Apply(Encuesta encuesta, EncuestaWriteDto dto)
    {
        encuesta.Titulo = dto.Titulo.Trim(); encuesta.Descripcion = dto.Descripcion?.Trim(); encuesta.EsVotacion = dto.EsVotacion; encuesta.EsAnonima = dto.EsAnonima;
        encuesta.PermiteEditarRespuesta = dto.PermiteEditarRespuesta; encuesta.VisibilidadResultados = dto.VisibilidadResultados;
        encuesta.FechaCierre = dto.FechaCierre?.ToUniversalTime(); encuesta.UpdatedAt = DateTime.UtcNow;
        foreach (var (q, index) in dto.Preguntas.Select((value, index) => (value, index)))
        {
            var question = new EncuestaPregunta { Tipo = q.Tipo, Texto = q.Texto.Trim(), Ayuda = q.Ayuda?.Trim(),
                Obligatoria = q.Obligatoria, Orden = index, Minimo = q.Minimo, Maximo = q.Maximo,
                CondicionPreguntaOrden = q.CondicionPreguntaOrden, CondicionOpcionOrden = q.CondicionOpcionOrden };
            foreach (var (option, optionIndex) in q.Opciones.Select((value, optionIndex) => (value, optionIndex)))
                question.Opciones.Add(new EncuestaOpcion { Texto = option.Trim(), Orden = optionIndex });
            encuesta.Preguntas.Add(question);
        }
        foreach (var id in dto.DestinatarioIds.Distinct()) encuesta.Destinatarios.Add(new EncuestaDestinatario { UsuarioId = id });
    }

    private static EncuestaPreguntaDto ToQuestion(EncuestaPregunta q) => new(q.EncuestaPreguntaId, q.Tipo, q.Texto, q.Ayuda,
        q.Obligatoria, q.Orden, q.Minimo, q.Maximo, q.CondicionPreguntaOrden, q.CondicionOpcionOrden,
        q.Opciones.OrderBy(o => o.Orden).Select(o => new EncuestaOpcionDto(o.EncuestaOpcionId, o.Texto, o.Orden)).ToList());

    private static bool IsQuestionVisible(Encuesta encuesta, EncuestaPregunta question, IReadOnlyCollection<EncuestaRespuestaValorDto> answers)
    {
        if (question.CondicionPreguntaOrden is null) return true;
        var source = encuesta.Preguntas.FirstOrDefault(q => q.Orden == question.CondicionPreguntaOrden);
        var requiredOption = source?.Opciones.FirstOrDefault(o => o.Orden == question.CondicionOpcionOrden);
        var sourceAnswer = source is null ? null : answers.FirstOrDefault(a => a.EncuestaPreguntaId == source.EncuestaPreguntaId);
        return requiredOption is not null && sourceAnswer?.OpcionIds.Contains(requiredOption.EncuestaOpcionId) == true;
    }
    private static EncuestaResumenDto ToSummary(Encuesta e, int userId, bool isAdmin, int allUsers, DateTime now) =>
        new(e.EncuestaId, e.Titulo, e.Descripcion, e.Estado == EncuestaEstado.Publicada && e.FechaCierre <= now ? EncuestaEstado.Cerrada : e.Estado,
            e.EsVotacion, e.EsAnonima, e.FechaCierre, e.CreatedAt, e.UsuarioCreador.Nombre, e.Respuestas.Any(r => r.UsuarioId == userId),
            e.Destinatarios.Count == 0 || e.Destinatarios.Any(d => d.UsuarioId == userId),
            e.Respuestas.Count, e.Destinatarios.Count == 0 ? allUsers : e.Destinatarios.Count,
            isAdmin || e.UsuarioCreadorId == userId);
    private static bool IsClosed(Encuesta e) => e.Estado == EncuestaEstado.Cerrada || e.FechaCierre is not null && e.FechaCierre <= DateTime.UtcNow;

    private async Task<List<string>> GetPendingNamesAsync(Encuesta e)
    {
        var answered = e.Respuestas.Select(r => r.UsuarioId).ToHashSet();
        if (e.Destinatarios.Count > 0) return e.Destinatarios.Where(d => !answered.Contains(d.UsuarioId)).Select(d => d.Usuario.Nombre).Order().ToList();
        return await context.Usuarios.AsNoTracking().Where(u => !u.EsUsuarioExterno && !answered.Contains(u.UsuarioId)).OrderBy(u => u.Nombre).Select(u => u.Nombre).ToListAsync();
    }

    private static List<EncuestaResultadoPreguntaDto> BuildResults(Encuesta e) => e.Preguntas.OrderBy(q => q.Orden).Select(q =>
    {
        var values = e.Respuestas.SelectMany(r => r.Valores).Where(v => v.EncuestaPreguntaId == q.EncuestaPreguntaId).ToList();
        var options = q.Opciones.OrderBy(o => o.Orden).Select(o =>
        {
            var votes = values.Count(v => v.Opciones.Any(selected => selected.EncuestaOpcionId == o.EncuestaOpcionId));
            var voters = e.EsAnonima
                ? null
                : e.Respuestas
                    .Where(response => response.Valores.Any(value =>
                        value.EncuestaPreguntaId == q.EncuestaPreguntaId &&
                        value.Opciones.Any(selected => selected.EncuestaOpcionId == o.EncuestaOpcionId)))
                    .Select(response => response.Usuario.Nombre)
                    .OrderBy(name => name)
                    .ToList();
            return new EncuestaResultadoOpcionDto(o.EncuestaOpcionId, o.Texto, votes,
                values.Count == 0 ? 0 : Math.Round(votes * 100m / values.Count, 1), voters);
        }).ToList();
        var numbers = values.Where(v => v.Numero is not null).Select(v => v.Numero!.Value).ToList();
        return new EncuestaResultadoPreguntaDto(q.EncuestaPreguntaId, q.Texto, q.Tipo, values.Count,
            numbers.Count == 0 ? null : Math.Round(numbers.Average(value => (decimal)value), 2), options,
            values.Where(v => !string.IsNullOrWhiteSpace(v.Texto)).Select(v => v.Texto!).ToList());
    }).ToList();
}
