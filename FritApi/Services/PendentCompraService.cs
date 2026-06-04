using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class PendentCompraService
{
    private readonly AppDbContext _context;

    public PendentCompraService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PendentCompraDto>> GetAllAsync()
    {
        return await _context.PendentsCompra
            .OrderBy(item => item.CreatedAt)
            .ThenBy(item => item.PendentCompraId)
            .Select(item => new PendentCompraDto
            {
                PendentCompraId = item.PendentCompraId,
                UsuarioId = item.UsuarioId,
                UsuarioNombre = item.Usuario.Nombre,
                Quantitat = item.Quantitat,
                Descripcio = item.Descripcio,
                Link = item.Link,
                CreatedAt = item.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<(bool Success, string? Error, PendentCompraDto? Item)> CreateAsync(
        int usuarioId,
        PendentCompraWriteDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == usuarioId);

        if (usuario is null)
        {
            return (false, "Usuari no trobat.", null);
        }

        var link = string.IsNullOrWhiteSpace(dto.Link) ? null : dto.Link.Trim();
        var item = new PendentCompra
        {
            UsuarioId = usuarioId,
            Quantitat = dto.Quantitat,
            Descripcio = dto.Descripcio.Trim(),
            Link = link
        };

        _context.PendentsCompra.Add(item);
        await _context.SaveChangesAsync();

        return (true, null, new PendentCompraDto
        {
            PendentCompraId = item.PendentCompraId,
            UsuarioId = item.UsuarioId,
            UsuarioNombre = usuario.Nombre,
            Quantitat = item.Quantitat,
            Descripcio = item.Descripcio,
            Link = item.Link,
            CreatedAt = item.CreatedAt
        });
    }

    public async Task<int> DeleteSelectedAsync(IEnumerable<int> ids)
    {
        var idsList = ids.Distinct().ToList();

        if (idsList.Count == 0)
        {
            return 0;
        }

        var items = await _context.PendentsCompra
            .Where(item => idsList.Contains(item.PendentCompraId))
            .ToListAsync();

        _context.PendentsCompra.RemoveRange(items);
        await _context.SaveChangesAsync();

        return items.Count;
    }
}
