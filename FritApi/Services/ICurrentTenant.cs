namespace FritApi.Services;

public interface ICurrentTenant
{
    int? TenantId { get; }
}
