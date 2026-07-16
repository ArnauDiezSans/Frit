namespace FritApi.Models;

public class UsuarioJuegoOrden : ITenantEntity
{
    public int UsuarioJuegoOrdenId { get; set; }
    public int TenantId { get; set; }

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public int JuegoId { get; set; }
    public Juego Juego { get; set; } = null!;

    public int Puntuacion { get; set; }
}
