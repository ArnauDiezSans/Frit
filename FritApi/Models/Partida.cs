namespace FritApi.Models;

public class Partida
{
    public int PartidaId { get; set; }

    public int JuegoId { get; set; }
    public Juego Juego { get; set; } = null!;

    public int UsuarioCreadorId { get; set; }
    public Usuario UsuarioCreador { get; set; } = null!;

    public DateOnly Fecha { get; set; }

    public int? DuracionMinutos { get; set; }

    public int NumeroJugadores { get; set; }

    public string? Observaciones { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<PartidaJugador> Jugadores { get; set; } = new List<PartidaJugador>();
}