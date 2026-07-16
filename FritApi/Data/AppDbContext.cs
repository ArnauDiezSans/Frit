using FritApi.Models;
using FritApi.Services;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Data;

public class AppDbContext : DbContext
{
    private readonly ICurrentTenant? _currentTenant;

    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public AppDbContext(DbContextOptions<AppDbContext> options, ICurrentTenant currentTenant) : base(options)
    {
        _currentTenant = currentTenant;
    }

    public int CurrentTenantId => _currentTenant is null ? 1 : _currentTenant.TenantId ?? 0;

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Juego> Juegos => Set<Juego>();
    public DbSet<Partida> Partidas => Set<Partida>();
    public DbSet<PartidaJugador> PartidaJugadores => Set<PartidaJugador>();
    public DbSet<UsuarioJuegoOrden> UsuarioJuegoOrdenes => Set<UsuarioJuegoOrden>();
    public DbSet<PendentCompra> PendentsCompra => Set<PendentCompra>();
    public DbSet<CinePelicula> CinePeliculas => Set<CinePelicula>();
    public DbSet<CineValoracion> CineValoraciones => Set<CineValoracion>();
    public DbSet<CsopaActivitat> CsopaActivitats => Set<CsopaActivitat>();
    public DbSet<CsopaAssistencia> CsopaAssistencies => Set<CsopaAssistencia>();
    public DbSet<ManualMedalla> ManualMedallas => Set<ManualMedalla>();
    public DbSet<ManualMedallaUsuario> ManualMedallaUsuarios => Set<ManualMedallaUsuario>();
    public DbSet<Remada> Remades => Set<Remada>();
    public DbSet<RemadaJugador> RemadaJugadors => Set<RemadaJugador>();
    public DbSet<RemadaJuego> RemadaJocs => Set<RemadaJuego>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(e => e.TenantId);

            entity.Property(e => e.Codi)
                .IsRequired()
                .HasMaxLength(100);

            entity.Property(e => e.Nom)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Actiu)
                .HasDefaultValue(true);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.Codi)
                .IsUnique();
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.UsuarioId);

            entity.Property(e => e.Nombre)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Grupo)
                .HasMaxLength(200);

            entity.Property(e => e.Observaciones)
                .HasMaxLength(800);

            entity.Property(e => e.PasswordHash)
                .IsRequired();

            entity.Property(e => e.EsAdmin)
                .HasDefaultValue(false);

            entity.Property(e => e.EsUsuarioExterno)
                .HasDefaultValue(false);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => new { e.TenantId, e.Nombre })
                .IsUnique();
        });

        modelBuilder.Entity<Juego>(entity =>
        {
            entity.HasKey(e => e.JuegoId);

            entity.Property(e => e.Nombre)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Tipo)
                .HasMaxLength(200);

            entity.Property(e => e.DificultadBgg)
                .HasPrecision(4, 2);

            entity.Property(e => e.Pvp)
                .HasPrecision(10, 2);

            entity.HasOne(e => e.Propietario)
                .WithMany()
                .HasForeignKey(e => e.PropietarioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.JuegoBase)
                .WithMany(e => e.Expansiones)
                .HasForeignKey(e => e.JuegoBaseId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Partida>(entity =>
        {
            entity.HasKey(e => e.PartidaId);

            entity.Property(e => e.Observaciones)
                .HasMaxLength(1000);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Juego)
                .WithMany(e => e.Partidas)
                .HasForeignKey(e => e.JuegoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.UsuarioCreador)
                .WithMany()
                .HasForeignKey(e => e.UsuarioCreadorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PartidaJugador>(entity =>
        {
            entity.HasKey(e => e.PartidaJugadorId);

            entity.Property(e => e.NombreMostrado)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Puntos)
                .HasPrecision(10, 2);

            entity.HasOne(e => e.Partida)
                .WithMany(e => e.Jugadores)
                .HasForeignKey(e => e.PartidaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.PartidaId, e.Posicion });
        });

        modelBuilder.Entity<UsuarioJuegoOrden>(entity =>
        {
            entity.HasKey(e => e.UsuarioJuegoOrdenId);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Juego)
                .WithMany()
                .HasForeignKey(e => e.JuegoId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UsuarioId, e.JuegoId })
                .IsUnique();
        });

        modelBuilder.Entity<PendentCompra>(entity =>
        {
            entity.HasKey(e => e.PendentCompraId);

            entity.Property(e => e.Descripcio)
                .IsRequired()
                .HasMaxLength(500);

            entity.Property(e => e.Link)
                .HasMaxLength(1000);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<CinePelicula>(entity =>
        {
            entity.HasKey(e => e.CinePeliculaId);

            entity.Property(e => e.Titulo)
                .IsRequired()
                .HasMaxLength(300);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.GrupoPelicula)
                .HasColumnName("Grupo_pelicula");

            entity.HasOne(e => e.UsuarioCreador)
                .WithMany()
                .HasForeignKey(e => e.UsuarioCreadorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<CineValoracion>(entity =>
        {
            entity.HasKey(e => e.CineValoracionId);

            entity.Property(e => e.Nota)
                .HasPrecision(4, 2);

            entity.Property(e => e.Observacion)
                .HasMaxLength(200);

            entity.Property(e => e.NombreMostrado)
                .HasMaxLength(200);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.CinePelicula)
                .WithMany(e => e.Valoraciones)
                .HasForeignKey(e => e.CinePeliculaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.CinePeliculaId, e.UsuarioId })
                .IsUnique();
        });

        modelBuilder.Entity<CsopaActivitat>(entity =>
        {
            entity.HasKey(e => e.CsopaActivitatId);

            entity.Property(e => e.Titol)
                .IsRequired()
                .HasMaxLength(300);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.UsuarioCreador)
                .WithMany()
                .HasForeignKey(e => e.UsuarioCreadorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.Tipus);
        });

        modelBuilder.Entity<CsopaAssistencia>(entity =>
        {
            entity.HasKey(e => e.CsopaAssistenciaId);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.NombreMostrado)
                .HasMaxLength(200);

            entity.HasOne(e => e.CsopaActivitat)
                .WithMany(e => e.Assistencies)
                .HasForeignKey(e => e.CsopaActivitatId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.CsopaActivitatId, e.UsuarioId })
                .IsUnique();
        });

        modelBuilder.Entity<ManualMedalla>(entity =>
        {
            entity.HasKey(e => e.ManualMedallaId);

            entity.Property(e => e.Nombre)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Descripcion)
                .HasMaxLength(800);

            entity.Property(e => e.IconPath)
                .HasMaxLength(500);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

        });

        modelBuilder.Entity<ManualMedallaUsuario>(entity =>
        {
            entity.HasKey(e => e.ManualMedallaUsuarioId);

            entity.HasOne(e => e.ManualMedalla)
                .WithMany(e => e.Usuarios)
                .HasForeignKey(e => e.ManualMedallaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.ManualMedallaId, e.UsuarioId })
                .IsUnique();
        });

        modelBuilder.Entity<Remada>(entity =>
        {
            entity.HasKey(e => e.RemadaId);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.UsuarioCreador)
                .WithMany()
                .HasForeignKey(e => e.UsuarioCreadorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.CreatedAt);
        });

        modelBuilder.Entity<RemadaJugador>(entity =>
        {
            entity.HasKey(e => e.RemadaJugadorId);

            entity.Property(e => e.UsuarioNombre)
                .IsRequired()
                .HasMaxLength(200);

            entity.HasOne(e => e.Remada)
                .WithMany(e => e.Jugadors)
                .HasForeignKey(e => e.RemadaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany()
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.RemadaId, e.UsuarioId })
                .IsUnique();
        });

        modelBuilder.Entity<RemadaJuego>(entity =>
        {
            entity.HasKey(e => e.RemadaJuegoId);

            entity.Property(e => e.JuegoNombre)
                .IsRequired()
                .HasMaxLength(200);

            entity.HasOne(e => e.Remada)
                .WithMany(e => e.Jocs)
                .HasForeignKey(e => e.RemadaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Juego)
                .WithMany()
                .HasForeignKey(e => e.JuegoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => new { e.RemadaId, e.JuegoId })
                .IsUnique();
        });

        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(entityType => typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType)))
        {
            modelBuilder.Entity(entityType.ClrType)
                .HasOne(
                    typeof(Tenant),
                    entityType.ClrType == typeof(Usuario) ? nameof(Usuario.Tenant) : null)
                .WithMany()
                .HasForeignKey(nameof(ITenantEntity.TenantId))
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity(entityType.ClrType)
                .HasIndex(nameof(ITenantEntity.TenantId));

            var method = typeof(AppDbContext)
                .GetMethod(nameof(ConfigureTenantFilter), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!
                .MakeGenericMethod(entityType.ClrType);
            method.Invoke(this, [modelBuilder]);
        }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyTenantRules();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        ApplyTenantRules();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ConfigureTenantFilter<TEntity>(ModelBuilder modelBuilder)
        where TEntity : class, ITenantEntity
    {
        modelBuilder.Entity<TEntity>()
            .HasQueryFilter(entity => entity.TenantId == CurrentTenantId);
    }

    private void ApplyTenantRules()
    {
        var tenantId = CurrentTenantId;

        foreach (var entry in ChangeTracker.Entries<ITenantEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.TenantId == 0)
                {
                    entry.Entity.TenantId = tenantId;
                }
                else if (tenantId != 0 && entry.Entity.TenantId != tenantId)
                {
                    throw new InvalidOperationException("No es poden crear dades en un altre tenant.");
                }
            }
            else if (entry.State == EntityState.Modified && entry.Property(nameof(ITenantEntity.TenantId)).IsModified)
            {
                throw new InvalidOperationException("No es pot canviar el tenant d'un registre.");
            }
        }
    }
}
