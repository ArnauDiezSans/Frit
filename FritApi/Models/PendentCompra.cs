using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class PendentCompra : ITenantEntity
{
    public int PendentCompraId { get; set; }
    public int TenantId { get; set; }

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public int Quantitat { get; set; }

    [Required]
    [MaxLength(500)]
    public string Descripcio { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Link { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
