namespace FritApi.Models;

public class UsuarioJuegoOrden
{
    public int UsuarioJuegoOrdenId { get; set; }

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;

    public int JuegoId { get; set; }
    public Juego Juego { get; set; } = null!;

    public int Posicion { get; set; }
}
