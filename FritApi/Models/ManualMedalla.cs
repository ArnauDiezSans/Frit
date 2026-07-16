using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class ManualMedalla : ITenantEntity
{
    public int ManualMedallaId { get; set; }
    public int TenantId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(800)]
    public string Descripcion { get; set; } = string.Empty;

    [MaxLength(500)]
    public string IconPath { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ManualMedallaUsuario> Usuarios { get; set; } = new List<ManualMedallaUsuario>();
}
