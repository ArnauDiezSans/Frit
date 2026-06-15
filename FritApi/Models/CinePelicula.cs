using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class CinePelicula
{
    public int CinePeliculaId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Titulo { get; set; } = string.Empty;

    public int UsuarioCreadorId { get; set; }
    public Usuario UsuarioCreador { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<CineValoracion> Valoraciones { get; set; } = [];
}
