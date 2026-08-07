using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class CinePelicula : ITenantEntity
{
    public int CinePeliculaId { get; set; }
    public int TenantId { get; set; }

    [Required]
    [MaxLength(300)]
    public string Titulo { get; set; } = string.Empty;

    public int UsuarioCreadorId { get; set; }
    public Usuario UsuarioCreador { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? GrupoPelicula { get; set; }

    public List<CineValoracion> Valoraciones { get; set; } = [];
}
