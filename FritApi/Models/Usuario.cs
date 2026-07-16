using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class Usuario : ITenantEntity
{
    public int UsuarioId { get; set; }
    public int TenantId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Grupo { get; set; }

    [MaxLength(800)]
    public string? Observaciones { get; set; }

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public bool EsAdmin { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
