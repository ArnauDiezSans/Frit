using FritApi.Data;
using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Tests;

public class AuditTests
{
    [Fact]
    public async Task SaveChanges_CreatesAuditWithoutPasswordHash()
    {
        await using var context = CreateContext();
        context.Usuarios.Add(new Usuario
        {
            Nombre = "Nou usuari",
            PasswordHash = "secret-hash"
        });

        await context.SaveChangesAsync();

        var audit = Assert.Single(await context.AuditEntries.ToListAsync());
        Assert.Equal("Alta", audit.Accion);
        Assert.Equal(nameof(Usuario), audit.Entidad);
        Assert.Equal("Arnau", audit.UsuarioNombre);
        Assert.Contains("Nou usuari", audit.ValoresNuevos);
        Assert.DoesNotContain("PasswordHash", audit.ValoresNuevos);
        Assert.DoesNotContain("secret-hash", audit.ValoresNuevos);
    }

    [Fact]
    public async Task SaveChanges_StoresBeforeAndAfterSnapshots()
    {
        var databaseName = "audit-tests-" + Guid.NewGuid();
        await using var seedContext = CreateContext(audit: false, databaseName: databaseName);
        var user = new Usuario { Nombre = "Anna", PasswordHash = "hash" };
        seedContext.Usuarios.Add(user);
        await seedContext.SaveChangesAsync();

        await using var context = CreateContext(databaseName: databaseName);
        var stored = await context.Usuarios.SingleAsync();
        stored.Nombre = "Anna Maria";
        await context.SaveChangesAsync();

        var audit = Assert.Single(await context.AuditEntries.ToListAsync());
        Assert.Equal("Modificacio", audit.Accion);
        Assert.Contains("Anna", audit.ValoresAnteriores);
        Assert.Contains("Anna Maria", audit.ValoresNuevos);
    }

    private static AppDbContext CreateContext(bool audit = true, string? databaseName = null)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName ?? "audit-tests-" + Guid.NewGuid())
            .Options;
        return audit
            ? new AppDbContext(options, new TestTenant(), new TestAuditContext())
            : new AppDbContext(options, new TestTenant());
    }

    private sealed class TestTenant : ICurrentTenant
    {
        public int? TenantId => 1;
    }

    private sealed class TestAuditContext : IAuditContext
    {
        public int? UsuarioId => 7;
        public string? UsuarioNombre => "Arnau";
        public string? Ip => "127.0.0.1";
    }
}
