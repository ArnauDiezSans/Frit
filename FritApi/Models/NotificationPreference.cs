using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class NotificationPreference : ITenantEntity
{
    public int NotificationPreferenceId { get; set; }
    public int TenantId { get; set; }
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public bool NuevaPartida { get; set; }
    public bool NuevaRemada { get; set; }
    public bool VotacionPelicula { get; set; }
    public bool Encuesta { get; set; }
    public bool CambioPreferenciaJuego { get; set; }
    [Range(0, 10)]
    public int PuntuacionMinima { get; set; } = 10;
    public bool RecordatorioDomingo { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
