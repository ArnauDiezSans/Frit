namespace FritApi.Dtos;

public record JuegoProgresoJugadorDto(int JuegoProgresoJugadorId, int? UsuarioId, string Nombre, bool EsVisita, int Orden);
public record JuegoProgresoNivelDto(int JuegoProgresoNivelId, string Nombre, int Orden);
public record JuegoProgresoMarcaDto(int JuegoProgresoJugadorId, int JuegoProgresoNivelId);
public record JuegoProgresoDto(int JuegoId, string JuegoNombre, List<JuegoProgresoJugadorDto> Jugadores,
    List<JuegoProgresoNivelDto> Niveles, List<JuegoProgresoMarcaDto> Marcas);
public record JuegoProgresoNombreDto(string Nombre);
public record JuegoProgresoMarcaWriteDto(int JuegoProgresoJugadorId, int JuegoProgresoNivelId, bool Assolit);
public record JuegoProgresoOrdenDto(List<int> NivelIds);
public record PartidaProgresoJugadorWriteDto(int PartidaJugadorId, List<int> NivelIds);
public record PartidaProgresoWriteDto(List<PartidaProgresoJugadorWriteDto> Jugadores);
