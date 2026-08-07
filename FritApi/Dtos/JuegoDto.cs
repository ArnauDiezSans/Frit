using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class JuegoDto
{
    public int JuegoId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    public int? BggId { get; set; }

    public decimal? DificultadBgg { get; set; }

    [Range(1, int.MaxValue)]
    public int NumeroJugadoresMin { get; set; }

    [Range(1, int.MaxValue)]
    public int NumeroJugadoresMax { get; set; }

    public decimal? Pvp { get; set; }

    [Required]
    public int PropietarioId { get; set; }

    public bool EsPropiedadTenant { get; set; }

    public DateOnly? FechaAdquisicion { get; set; }

    [MaxLength(200)]
    public string Tipo { get; set; } = string.Empty;

    public int? JuegoBaseId { get; set; }
}

public class BggJuegoLookupDto
{
    public int BggId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public decimal? DificultadBgg { get; set; }
    public int NumeroJugadoresMin { get; set; }
    public int NumeroJugadoresMax { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public int? YearPublished { get; set; }
    public int? PlayingTime { get; set; }
}
