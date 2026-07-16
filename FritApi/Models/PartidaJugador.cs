using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class PartidaJugador : ITenantEntity
{
    public int PartidaJugadorId { get; set; }
    public int TenantId { get; set; }

    public int PartidaId { get; set; }
    public Partida Partida { get; set; } = null!;

    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }

    [Required]
    [MaxLength(200)]
    public string NombreMostrado { get; set; } = string.Empty;

    public int Posicion { get; set; }

    public decimal? Puntos { get; set; }
}
