namespace FritApi.Dtos;

public class AuthUserDto
{
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public bool EsAdmin { get; set; }
    public int TenantId { get; set; }
    public string TenantCodi { get; set; } = string.Empty;
    public string TenantNom { get; set; } = string.Empty;
}
