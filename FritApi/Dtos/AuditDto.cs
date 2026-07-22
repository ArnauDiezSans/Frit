namespace FritApi.Dtos;

public class AuditEntryDto
{
    public long AuditEntryId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? Ip { get; set; }
    public string Entidad { get; set; } = string.Empty;
    public string RegistroId { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public string? ValoresAnteriors { get; set; }
    public string? ValorsNous { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AuditPageDto
{
    public List<AuditEntryDto> Items { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}
