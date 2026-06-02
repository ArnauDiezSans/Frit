using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class Juego
{
    public int JuegoId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    public int? BggId { get; set; }

    public decimal? DificultadBgg { get; set; }

    public int NumeroJugadoresMin { get; set; }

    public int NumeroJugadoresMax { get; set; }

    public decimal? Pvp { get; set; }

    public int PropietarioId { get; set; }
    public Usuario Propietario { get; set; } = null!;

    public DateOnly? FechaAdquisicion { get; set; }

    [MaxLength(200)]
    public string Tipo { get; set; } = string.Empty;

    public int? JuegoBaseId { get; set; }
    public Juego? JuegoBase { get; set; }

    public ICollection<Juego> Expansiones { get; set; } = new List<Juego>();
    public ICollection<Partida> Partidas { get; set; } = new List<Partida>();
}