namespace FritApi.Models;

public class EconomiaImputacio : ITenantEntity
{
    public int EconomiaImputacioId { get; set; }
    public int TenantId { get; set; }
    public int? EconomiaMovimentId { get; set; }
    public EconomiaMoviment? Moviment { get; set; }
    public string Categoria { get; set; } = "Altres";
    public string? Persona { get; set; }
    public DateOnly? Periode { get; set; }
    public decimal Import { get; set; }
    public string Descriptor { get; set; } = string.Empty;
    public bool RequereixRevisio { get; set; }
    public DateTime CreatedAt { get; set; }
}
