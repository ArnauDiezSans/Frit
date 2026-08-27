using FritApi.Data;
using FritApi.Dtos;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FritApi.Services;

public class AuditService(AppDbContext context, ICurrentTenant currentTenant)
{
    public Task<bool> IsAuthorizedAsync(int usuarioId) =>
        context.AuditAuthorizedUsers.AsNoTracking().AnyAsync(item => item.UsuarioId == usuarioId);

    public async Task<AuditPageDto> GetAsync(
        int page,
        int pageSize,
        string? usuario,
        string? entidad,
        string? accion,
        DateTime? desde,
        DateTime? hasta,
        string? texto)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var tenantId = currentTenant.TenantId ?? 0;
        var query = context.AuditEntries.AsNoTracking().Where(item => item.TenantId == tenantId);

        if (!string.IsNullOrWhiteSpace(usuario))
        {
            var value = usuario.Trim().ToLower();
            query = query.Where(item => item.UsuarioNombre.ToLower().Contains(value));
        }

        if (!string.IsNullOrWhiteSpace(entidad))
        {
            var value = entidad.Trim().ToLower();
            query = query.Where(item => item.Entidad.ToLower().Contains(value));
        }

        if (!string.IsNullOrWhiteSpace(accion))
        {
            var value = accion.Trim().ToLower();
            query = query.Where(item => item.Accion.ToLower() == value);
        }

        if (desde.HasValue)
        {
            query = query.Where(item => item.CreatedAt >= desde.Value.ToUniversalTime());
        }

        if (hasta.HasValue)
        {
            query = query.Where(item => item.CreatedAt <= hasta.Value.ToUniversalTime());
        }

        if (!string.IsNullOrWhiteSpace(texto))
        {
            var value = texto.Trim().ToLower();
            query = query.Where(item =>
                item.RegistroId.ToLower().Contains(value) ||
                (item.ValoresAnteriores != null && item.ValoresAnteriores.ToLower().Contains(value)) ||
                (item.ValoresNuevos != null && item.ValoresNuevos.ToLower().Contains(value)));
        }

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.AuditEntryId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(item => new AuditEntryDto
            {
                AuditEntryId = item.AuditEntryId,
                UsuarioId = item.UsuarioId,
                UsuarioNombre = item.UsuarioNombre,
                Ip = item.Ip,
                Entidad = item.Entidad,
                RegistroId = item.RegistroId,
                Accion = item.Accion,
                ValoresAnteriors = item.ValoresAnteriores,
                ValorsNous = item.ValoresNuevos,
                CreatedAt = item.CreatedAt
            })
            .ToListAsync();

        foreach (var item in items)
        {
            item.RegistroNombre = GetDisplayName(item.ValorsNous) ?? GetDisplayName(item.ValoresAnteriors);
        }

        return new AuditPageDto { Items = items, Total = total, Page = page, PageSize = pageSize };
    }

    private static string? GetDisplayName(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object) return null;
            string[] preferredFields = ["Nombre", "Nom", "Titulo", "Titol", "NombreMostrado", "Texto", "Descripcion"];
            foreach (var field in preferredFields)
            {
                if (document.RootElement.TryGetProperty(field, out var value) &&
                    value.ValueKind == JsonValueKind.String &&
                    !string.IsNullOrWhiteSpace(value.GetString()))
                {
                    return value.GetString()!.Trim();
                }
            }
        }
        catch (JsonException)
        {
            // Older rows may contain plain text instead of JSON.
        }
        return null;
    }
}
