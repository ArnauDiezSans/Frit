using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public class JuegoProgresoJugador : ITenantEntity
{
    public int JuegoProgresoJugadorId { get; set; }
    public int TenantId { get; set; }
    public int JuegoId { get; set; }
    public Juego Juego { get; set; } = null!;
    public int? UsuarioId { get; set; }
    public Usuario? Usuario { get; set; }
    [Required, MaxLength(200)] public string Nombre { get; set; } = string.Empty;
    public bool EsVisita { get; set; }
    public int Orden { get; set; }
    public ICollection<JuegoProgresoMarca> Marcas { get; set; } = [];
}

public class JuegoProgresoNivel : ITenantEntity
{
    public int JuegoProgresoNivelId { get; set; }
    public int TenantId { get; set; }
    public int JuegoId { get; set; }
    public Juego Juego { get; set; } = null!;
    [Required, MaxLength(300)] public string Nombre { get; set; } = string.Empty;
    public int Orden { get; set; }
    public ICollection<JuegoProgresoMarca> Marcas { get; set; } = [];
}

public class JuegoProgresoMarca : ITenantEntity
{
    public int JuegoProgresoMarcaId { get; set; }
    public int TenantId { get; set; }
    public int JuegoProgresoJugadorId { get; set; }
    public JuegoProgresoJugador Jugador { get; set; } = null!;
    public int JuegoProgresoNivelId { get; set; }
    public JuegoProgresoNivel Nivel { get; set; } = null!;
}
