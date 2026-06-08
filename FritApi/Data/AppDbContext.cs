using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Juego> Juegos => Set<Juego>();
    public DbSet<Partida> Partidas => Set<Partida>();
    public DbSet<PartidaJugador> PartidaJugadores => Set<PartidaJugador>();
    public DbSet<UsuarioJuegoOrden> UsuarioJuegoOrdenes => Set<UsuarioJuegoOrden>();
    public DbSet<PendentCompra> PendentsCompra => Set<PendentCompra>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("NOW()");
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

            entity.HasIndex(e => new { e.PartidaId, e.Posicion })
                .IsUnique();
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
    }
}
