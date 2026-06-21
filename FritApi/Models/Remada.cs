namespace FritApi.Models;

public class Remada
{
    public int RemadaId { get; set; }
    public int UsuarioCreadorId { get; set; }
    public Usuario UsuarioCreador { get; set; } = null!;
    public int TempsDisponibleMinuts { get; set; }
    public int NombreJocs { get; set; }
    public int PuntsPerJugador { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<RemadaJugador> Jugadors { get; set; } = [];
    public List<RemadaJuego> Jocs { get; set; } = [];
}
