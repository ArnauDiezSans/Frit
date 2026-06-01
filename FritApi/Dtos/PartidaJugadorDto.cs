using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class PartidaJugadorDto
{
    public int PartidaJugadorId { get; set; }

    [Required]
    public int PartidaId { get; set; }

    public int? UsuarioId { get; set; }

    [Required]
    [MaxLength(200)]
    public string NombreMostrado { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int Posicion { get; set; }

    public decimal? Puntos { get; set; }
}