namespace FritApi.Models;

public class CsopaAssistencia
{
    public int CsopaAssistenciaId { get; set; }

    public int CsopaActivitatId { get; set; }
    public CsopaActivitat CsopaActivitat { get; set; } = null!;

    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    public string? NombreMostrado { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
