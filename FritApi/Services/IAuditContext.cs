namespace FritApi.Services;

public interface IAuditContext
{
    int? UsuarioId { get; }
    string? UsuarioNombre { get; }
    string? Ip { get; }
}
