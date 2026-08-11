using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public sealed class NotificationPreferenceDto
{
    public bool NuevaPartida { get; set; }
    public bool NuevaRemada { get; set; }
    public bool Encuesta { get; set; }
    public bool CambioPreferenciaJuego { get; set; }
    [Range(0, 10)]
    public int PuntuacionMinima { get; set; } = 10;
    public bool RecordatorioDomingo { get; set; }
}
