namespace FritApi.Dtos;

public record EconomiaTotalDto(string Categoria, decimal Import);
public record EconomiaQuotaDto(string Persona, int Any, int Mes, decimal Import);
public record EconomiaMovimentDto(int Id, DateOnly Data, DateOnly DataValor, string DescriptorOriginal, string Descriptor, decimal Import, decimal? Saldo, string Categoria, bool RequereixRevisio);
public record EconomiaDashboardDto(IReadOnlyList<EconomiaTotalDto> Totals, IReadOnlyList<EconomiaQuotaDto> Quotes, IReadOnlyList<EconomiaMovimentDto> Moviments, IReadOnlyList<int> Anys);
public record EconomiaPreviewRequest(string Text);
public record EconomiaPreviewRowDto(DateOnly Data, DateOnly DataValor, string DescriptorOriginal, string Descriptor, decimal Import, decimal? Saldo, string Categoria, bool RequereixRevisio, IReadOnlyList<EconomiaQuotaDto> Quotes, bool Duplicat);
public record EconomiaImportRequest(IReadOnlyList<EconomiaPreviewRowDto> Moviments);
public record EconomiaImportResultDto(int Importats, int Duplicats, int PendentsRevisio);
public record EconomiaDescriptorRequest(string Descriptor);
