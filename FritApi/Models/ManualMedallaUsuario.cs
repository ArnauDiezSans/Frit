namespace FritApi.Models;

public class ManualMedallaUsuario : ITenantEntity
{
    public int ManualMedallaUsuarioId { get; set; }
    public int TenantId { get; set; }

    public int ManualMedallaId { get; set; }
    public ManualMedalla ManualMedalla { get; set; } = null!;

    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
}
