using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class CineValoracion : ITenantEntity
{
    public int CineValoracionId { get; set; }
    public int TenantId { get; set; }

    public int CinePeliculaId { get; set; }
    public CinePelicula CinePelicula { get; set; } = null!;

    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    [MaxLength(200)]
    public string? NombreMostrado { get; set; }

    public decimal? Nota { get; set; }

    [MaxLength(200)]
    public string? Observacion { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
