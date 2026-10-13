namespace FritApi.Models;

public class FritParty : ITenantEntity
{
    public int FritPartyId { get; set; }
    public int TenantId { get; set; }
    public string Nombre { get; set; } = "";
    public DateOnly Inicio { get; set; }
    public DateOnly Fin { get; set; }
    public DateTime? FrozenAt { get; set; }
    public string? Snapshot { get; set; }
}
