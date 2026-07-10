using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class CsopaService
{
    public const int TipusSopar = 1;
    public const int TipusGymfrit = 2;

    private readonly AppDbContext _context;

    public CsopaService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CsopaActivitatDto>> GetAllAsync(int usuarioId)
    {
        var activitats = await _context.CsopaActivitats
            .Include(activitat => activitat.UsuarioCreador)
            .Include(activitat => activitat.Assistencies)
                .ThenInclude(assistencia => assistencia.Usuario)
            .OrderByDescending(activitat => activitat.CreatedAt)
            .ThenByDescending(activitat => activitat.CsopaActivitatId)
            .ToListAsync();

        return activitats.Select(activitat => ToDto(activitat, usuarioId)).ToList();
    }

    public async Task<(bool Success, string? Error, CsopaActivitatDto? Activitat)> CreateAsync(
        int usuarioId,
        CsopaActivitatCreateDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);

        if (usuario is null)
        {
            return (false, "Usuari no trobat.", null);
        }

        if (ExternalUserPolicy.IsExternal(usuario))
        {
            return (false, "L'usuari Extern no pot publicar activitats.", null);
        }

        if (!dto.Tipus.HasValue || !IsValidTipus(dto.Tipus.Value))
        {
            return (false, "El tipus d'activitat és obligatori.", null);
        }

        if (!dto.Fecha.HasValue)
        {
            return (false, "La data és obligatòria.", null);
        }

        var titol = string.IsNullOrWhiteSpace(dto.Titol)
            ? GetDefaultTitol(dto.Tipus.Value)
            : dto.Titol.Trim();

        var activitat = new CsopaActivitat
        {
            Titol = titol,
            Tipus = dto.Tipus.Value,
            UsuarioCreadorId = usuarioId,
            CreatedAt = dto.Fecha.Value.ToDateTime(new TimeOnly(12, 0), DateTimeKind.Utc)
        };

        _context.CsopaActivitats.Add(activitat);
        await _context.SaveChangesAsync();

        activitat.UsuarioCreador = usuario;

        return (true, null, ToDto(activitat, usuarioId));
    }

    public async Task<(bool Success, string? Error, CsopaActivitatDto? Activitat)> MarcarAssistenciaAsync(
        int activitatId,
        int currentUsuarioId,
        CsopaAssistenciaCreateDto dto)
    {
        var currentUsuario = await _context.Usuarios.FirstOrDefaultAsync(usuario => usuario.UsuarioId == currentUsuarioId);

        if (currentUsuario is null)
        {
            return (false, "Usuari no trobat.", null);
        }

        if (ExternalUserPolicy.IsExternal(currentUsuario))
        {
            return (false, "L'usuari Extern no pot marcar assistències.", null);
        }

        var nombreMostrado = dto.NombreMostrado?.Trim();
        if (!dto.UsuarioId.HasValue && string.IsNullOrWhiteSpace(nombreMostrado))
        {
            return (false, "L'usuari o el nom de l'assistent és obligatori.", null);
        }

        var usuario = dto.UsuarioId.HasValue
            ? await _context.Usuarios.FirstOrDefaultAsync(item => item.UsuarioId == dto.UsuarioId.Value)
            : null;

        if (dto.UsuarioId.HasValue && (usuario is null || ExternalUserPolicy.IsExternal(usuario)))
        {
            return (false, "Usuari no trobat.", null);
        }

        var activitat = await _context.CsopaActivitats
            .Include(item => item.UsuarioCreador)
            .Include(item => item.Assistencies)
                .ThenInclude(assistencia => assistencia.Usuario)
            .FirstOrDefaultAsync(item => item.CsopaActivitatId == activitatId);

        if (activitat is null)
        {
            return (false, "Activitat no trobada.", null);
        }

        if (usuario is not null && activitat.Assistencies.Any(assistencia => assistencia.UsuarioId == usuario.UsuarioId))
        {
            return (false, "Aquest usuari ja consta com a assistent.", null);
        }

        if (usuario is null && activitat.Assistencies.Any(assistencia => assistencia.UsuarioId is null &&
            string.Equals(assistencia.NombreMostrado, nombreMostrado, StringComparison.OrdinalIgnoreCase)))
        {
            return (false, "Aquest assistent ja hi consta.", null);
        }

        var assistencia = new CsopaAssistencia
        {
            CsopaActivitatId = activitatId,
            UsuarioId = usuario?.UsuarioId,
            NombreMostrado = usuario is null ? nombreMostrado : null
        };

        _context.CsopaAssistencies.Add(assistencia);
        await _context.SaveChangesAsync();

        assistencia.Usuario = usuario;
        if (!activitat.Assistencies.Any(item => item.CsopaAssistenciaId == assistencia.CsopaAssistenciaId))
        {
            activitat.Assistencies.Add(assistencia);
        }

        return (true, null, ToDto(activitat, currentUsuarioId));
    }

    public async Task<(bool Success, string? Error)> DeleteActivitatAsync(int activitatId, int currentUsuarioId)
    {
        var currentUsuario = await _context.Usuarios.FirstOrDefaultAsync(usuario => usuario.UsuarioId == currentUsuarioId);

        if (!IsCsopaAdmin(currentUsuario))
        {
            return (false, "No tens permisos per editar C sopa/Gymfrit.");
        }

        var activitat = await _context.CsopaActivitats.FirstOrDefaultAsync(item => item.CsopaActivitatId == activitatId);

        if (activitat is null)
        {
            return (false, "Activitat no trobada.");
        }

        _context.CsopaActivitats.Remove(activitat);
        await _context.SaveChangesAsync();

        return (true, null);
    }

    public async Task<(bool Success, string? Error, CsopaActivitatDto? Activitat)> DeleteAssistenciaAsync(
        int activitatId,
        int assistenciaId,
        int currentUsuarioId)
    {
        var currentUsuario = await _context.Usuarios.FirstOrDefaultAsync(usuario => usuario.UsuarioId == currentUsuarioId);

        if (!IsCsopaAdmin(currentUsuario))
        {
            return (false, "No tens permisos per editar C sopa/Gymfrit.", null);
        }

        var activitat = await _context.CsopaActivitats
            .Include(item => item.UsuarioCreador)
            .Include(item => item.Assistencies)
                .ThenInclude(assistencia => assistencia.Usuario)
            .FirstOrDefaultAsync(item => item.CsopaActivitatId == activitatId);

        if (activitat is null)
        {
            return (false, "Activitat no trobada.", null);
        }

        var assistencia = activitat.Assistencies.FirstOrDefault(item => item.CsopaAssistenciaId == assistenciaId);

        if (assistencia is null)
        {
            return (false, "Assistència no trobada.", null);
        }

        _context.CsopaAssistencies.Remove(assistencia);
        await _context.SaveChangesAsync();
        activitat.Assistencies.Remove(assistencia);

        return (true, null, ToDto(activitat, currentUsuarioId));
    }

    private static CsopaActivitatDto ToDto(CsopaActivitat activitat, int usuarioId)
    {
        return new CsopaActivitatDto
        {
            CsopaActivitatId = activitat.CsopaActivitatId,
            Titol = activitat.Titol,
            Tipus = activitat.Tipus,
            UsuarioCreadorId = activitat.UsuarioCreadorId,
            UsuarioCreadorNombre = activitat.UsuarioCreador.Nombre,
            CreatedAt = activitat.CreatedAt,
            YaAsistidaPorUsuario = activitat.Assistencies.Any(assistencia => assistencia.UsuarioId == usuarioId),
            Assistencies = activitat.Assistencies
                .OrderBy(assistencia => assistencia.Usuario != null ? assistencia.Usuario.Nombre : assistencia.NombreMostrado)
                .Select(assistencia => new CsopaAssistenciaDto
                {
                    CsopaAssistenciaId = assistencia.CsopaAssistenciaId,
                    UsuarioId = assistencia.UsuarioId,
                    UsuarioNombre = assistencia.Usuario?.Nombre ?? assistencia.NombreMostrado ?? string.Empty,
                    CreatedAt = assistencia.CreatedAt
                })
                .ToList()
        };
    }

    private static bool IsValidTipus(int tipus)
    {
        return tipus is TipusSopar or TipusGymfrit;
    }

    private static string GetDefaultTitol(int tipus)
    {
        return tipus == TipusGymfrit ? "Gymfrit" : "Sopar";
    }

    private static bool IsCsopaAdmin(Usuario? usuario)
    {
        return usuario is not null && string.Equals(usuario.Nombre, "Arnau", StringComparison.Ordinal);
    }
}
