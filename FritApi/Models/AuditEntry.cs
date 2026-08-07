using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class AuditEntry
{
    public long AuditEntryId { get; set; }
    public int TenantId { get; set; }
    public int UsuarioId { get; set; }

    [MaxLength(200)]
    public string UsuarioNombre { get; set; } = string.Empty;

    [MaxLength(45)]
    public string? Ip { get; set; }

    [MaxLength(100)]
    public string Entidad { get; set; } = string.Empty;

    [MaxLength(500)]
    public string RegistroId { get; set; } = string.Empty;

    [MaxLength(20)]
    public string Accion { get; set; } = string.Empty;

    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
