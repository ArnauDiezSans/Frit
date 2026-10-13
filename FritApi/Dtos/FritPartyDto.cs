using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class FritPartyRequest
{
    [Required, MaxLength(200)] public string Nombre { get; set; } = "";
    public DateOnly Inicio { get; set; }
    public DateOnly Fin { get; set; }
}

public record FritPartyGame(int PartidaId, string Juego, DateOnly Fecha, int Posicion, decimal Peso, decimal Multiplicador, decimal Puntos);
public record FritPartyPlayer(string Key, string Nombre, int Posicion, decimal Puntos, int PartidasTotales, List<FritPartyGame> Partidas);
public record FritPartyDto(int FritPartyId, string Nombre, DateOnly Inicio, DateOnly Fin, DateTime? FrozenAt, List<FritPartyPlayer> Jugadores, List<string> Errores);
