using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class PushSubscription : ITenantEntity
{
    public int PushSubscriptionId { get; set; }
    public int TenantId { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    [Required]
    [MaxLength(2000)]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string P256dh { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Auth { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
