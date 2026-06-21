using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class RemadaJugador
{
    public int RemadaJugadorId { get; set; }
    public int RemadaId { get; set; }
    public Remada Remada { get; set; } = null!;
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    [Required]
    [MaxLength(200)]
    public string UsuarioNombre { get; set; } = string.Empty;
    public int Punts { get; set; }
}
