using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class PartidaDto
{
    public int PartidaId { get; set; }

    [Required]
    public int JuegoId { get; set; }

    public string JuegoNombre { get; set; } = string.Empty;

    [Required]
    public DateOnly Fecha { get; set; }

    [Range(1, int.MaxValue)]
    public int? DuracionMinutos { get; set; }

    [Range(1, int.MaxValue)]
    public int NumeroJugadores { get; set; }

    [MaxLength(1000)]
    public string? Observaciones { get; set; }

    public DateTime CreatedAt { get; set; }
}