using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class CsopaActivitat : ITenantEntity
{
    public int CsopaActivitatId { get; set; }
    public int TenantId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Titol { get; set; } = string.Empty;

    public int Tipus { get; set; }

    public int UsuarioCreadorId { get; set; }
    public Usuario UsuarioCreador { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<CsopaAssistencia> Assistencies { get; set; } = [];
}
