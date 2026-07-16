using FritApi.Data;
using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Tests;

public class TenantIsolationTests
{
    [Fact]
    public async Task GlobalFilters_OnlyReturnCurrentTenantData()
    {
        var options = CreateOptions();
        await SeedTenantsAsync(options);

        await using (var tenantOne = CreateContext(options, 1))
        {
            tenantOne.Usuarios.Add(new Usuario { Nombre = "Alex", PasswordHash = "hash" });
            await tenantOne.SaveChangesAsync();
        }

        await using (var tenantTwo = CreateContext(options, 2))
        {
            tenantTwo.Usuarios.Add(new Usuario { Nombre = "Alex", PasswordHash = "hash" });
            await tenantTwo.SaveChangesAsync();
        }

        await using var firstContext = CreateContext(options, 1);
        await using var secondContext = CreateContext(options, 2);

        var firstUser = Assert.Single(await firstContext.Usuarios.ToListAsync());
        var secondUser = Assert.Single(await secondContext.Usuarios.ToListAsync());
        Assert.Equal(1, firstUser.TenantId);
        Assert.Equal(2, secondUser.TenantId);
        Assert.NotEqual(firstUser.UsuarioId, secondUser.UsuarioId);
    }

    [Fact]
    public async Task SaveChanges_AssignsCurrentTenantToNewRows()
    {
        var options = CreateOptions();
        await SeedTenantsAsync(options);
        await using var context = CreateContext(options, 2);

        var user = new Usuario { Nombre = "Berta", PasswordHash = "hash" };
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();

        Assert.Equal(2, user.TenantId);
    }

    [Fact]
    public async Task SaveChanges_RejectsExplicitDifferentTenant()
    {
        var options = CreateOptions();
        await SeedTenantsAsync(options);
        await using var context = CreateContext(options, 1);

        context.Usuarios.Add(new Usuario { TenantId = 2, Nombre = "Intrús", PasswordHash = "hash" });

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
        Assert.Contains("altre tenant", error.Message);
    }

    [Fact]
    public async Task SaveChanges_RejectsTenantChanges()
    {
        var options = CreateOptions();
        await SeedTenantsAsync(options);
        await using var context = CreateContext(options, 1);
        var user = new Usuario { Nombre = "Ada", PasswordHash = "hash" };
        context.Usuarios.Add(user);
        await context.SaveChangesAsync();

        user.TenantId = 2;

        await Assert.ThrowsAsync<InvalidOperationException>(() => context.SaveChangesAsync());
    }

    private static DbContextOptions<AppDbContext> CreateOptions() =>
        new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

    private static AppDbContext CreateContext(DbContextOptions<AppDbContext> options, int tenantId) =>
        new(options, new FixedCurrentTenant(tenantId));

    private static async Task SeedTenantsAsync(DbContextOptions<AppDbContext> options)
    {
        await using var context = new AppDbContext(options);
        context.Tenants.AddRange(
            new Tenant { TenantId = 1, Codi = "frit14", Nom = "Frit14" },
            new Tenant { TenantId = 2, Codi = "altre", Nom = "Altre" });
        await context.SaveChangesAsync();
    }

    private sealed class FixedCurrentTenant(int tenantId) : ICurrentTenant
    {
        public int? TenantId { get; } = tenantId;
    }
}
