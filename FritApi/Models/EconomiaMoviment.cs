namespace FritApi.Models;

public class EconomiaMoviment : ITenantEntity
{
    public int EconomiaMovimentId { get; set; }
    public int TenantId { get; set; }
    public DateOnly Data { get; set; }
    public DateOnly DataValor { get; set; }
    public string DescriptorOriginal { get; set; } = string.Empty;
    public string Descriptor { get; set; } = string.Empty;
    public decimal Import { get; set; }
    public decimal? Saldo { get; set; }
    public string Empremta { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public ICollection<EconomiaImputacio> Imputacions { get; set; } = [];
}
