namespace FritApi.Dtos;

public class LaLlistaItemDto
{
    public int JuegoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public DateOnly? UltimaPartida { get; set; }
    public string EstadoCaducidad { get; set; } = string.Empty;
}
