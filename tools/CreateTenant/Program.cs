using FritApi.Data;
using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var values = args
    .Chunk(2)
    .Where(pair => pair.Length == 2 && pair[0].StartsWith("--", StringComparison.Ordinal))
    .ToDictionary(pair => pair[0], pair => pair[1], StringComparer.OrdinalIgnoreCase);

string Required(string name) => values.TryGetValue(name, out var value) && !string.IsNullOrWhiteSpace(value)
    ? value.Trim()
    : throw new ArgumentException($"Falta el paràmetre obligatori {name}.");

var code = Required("--code").ToLowerInvariant();
var name = Required("--name");
var registrationCode = Required("--registration-code");
var adminName = Required("--admin");
var adminPassword = Required("--password");
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? throw new InvalidOperationException("La variable DATABASE_URL no està configurada.");

var connectionString = ParseConnectionString(databaseUrl);
var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options;
var passwordService = new PasswordService();

await using var bootstrapContext = new AppDbContext(options);
if (await bootstrapContext.Tenants.AnyAsync(item => item.Codi == code))
{
    throw new InvalidOperationException($"Ja existeix el tenant '{code}'.");
}

var tenant = new Tenant
{
    Codi = code,
    Nom = name,
    CodiRegistreHash = passwordService.HashPassword(registrationCode)
};
bootstrapContext.Tenants.Add(tenant);
await bootstrapContext.SaveChangesAsync();

await using var tenantContext = new AppDbContext(options, new FixedCurrentTenant(tenant.TenantId));
tenantContext.Usuarios.Add(new Usuario
{
    TenantId = tenant.TenantId,
    Nombre = adminName,
    PasswordHash = passwordService.HashPassword(adminPassword),
    EsAdmin = true
});
await tenantContext.SaveChangesAsync();

Console.WriteLine($"Tenant '{tenant.Nom}' ({tenant.Codi}) creat amb l'administrador '{adminName}'.");

static string ParseConnectionString(string value)
{
    if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return value;
    }

    var uri = new Uri(value);
    var userInfo = uri.UserInfo.Split(':', 2);
    return new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.Trim('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        SslMode = SslMode.Require
    }.ConnectionString;
}

file sealed class FixedCurrentTenant(int tenantId) : ICurrentTenant
{
    public int? TenantId { get; } = tenantId;
}
