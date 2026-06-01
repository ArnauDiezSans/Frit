namespace FritApi.Dtos;

public class UsuarioDto
{
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Grupo { get; set; }
    public string? Observaciones { get; set; }
    public DateTime CreatedAt { get; set; }
}