using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class Usuario
{
    public int UsuarioId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Grupo { get; set; }

    [MaxLength(800)]
    public string? Observaciones { get; set; }

    [Required]
    [MaxLength(500)]
    public string PasswordHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Juego> JuegosPropiedad { get; set; } = new List<Juego>();
    public ICollection<PartidaJugador> PartidasJugadas { get; set; } = new List<PartidaJugador>();
}