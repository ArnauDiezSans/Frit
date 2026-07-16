using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class Tenant
{
    public int TenantId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Codi { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Nom { get; set; } = string.Empty;

    public string? CodiRegistreHash { get; set; }

    public bool Actiu { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
