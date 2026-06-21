using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class RemadaJuego
{
    public int RemadaJuegoId { get; set; }
    public int RemadaId { get; set; }
    public Remada Remada { get; set; } = null!;
    public int JuegoId { get; set; }
    public Juego Juego { get; set; } = null!;
    [Required]
    [MaxLength(200)]
    public string JuegoNombre { get; set; } = string.Empty;
    public int Posicion { get; set; }
}
