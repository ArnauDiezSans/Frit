using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Usuario> Usuarios { get; set; } = null!;
    public DbSet<Juego> Juegos { get; set; } = null!;
    public DbSet<Partida> Partidas { get; set; } = null!;
    public DbSet<PartidaJugador> PartidaJugadores { get; set; } = null!;

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
                .IsRequired()
                .HasMaxLength(500);

            entity.HasIndex(e => e.Nombre);
        });

        modelBuilder.Entity<Juego>(entity =>
        {
            entity.HasKey(e => e.JuegoId);

            entity.Property(e => e.Tipo)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Pvp)
                .HasColumnType("numeric(10,2)");

            entity.Property(e => e.DificultadBgg)
                .HasColumnType("numeric(4,2)");

            entity.HasOne(e => e.Propietario)
                .WithMany(u => u.JuegosPropiedad)
                .HasForeignKey(e => e.PropietarioId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.JuegoBase)
                .WithMany(j => j.Expansiones)
                .HasForeignKey(e => e.JuegoBaseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.BggId);
            entity.HasIndex(e => e.PropietarioId);
        });

        modelBuilder.Entity<Partida>(entity =>
        {
            entity.HasKey(e => e.PartidaId);

            entity.Property(e => e.Observaciones);

            entity.HasOne(e => e.Juego)
                .WithMany(j => j.Partidas)
                .HasForeignKey(e => e.JuegoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(e => e.Fecha);
            entity.HasIndex(e => e.JuegoId);
        });

        modelBuilder.Entity<PartidaJugador>(entity =>
        {
            entity.HasKey(e => e.PartidaJugadorId);

            entity.Property(e => e.NombreMostrado)
                .IsRequired()
                .HasMaxLength(200);

            entity.Property(e => e.Puntos)
                .HasColumnType("numeric(10,2)");

            entity.HasOne(e => e.Partida)
                .WithMany(p => p.Jugadores)
                .HasForeignKey(e => e.PartidaId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Usuario)
                .WithMany(u => u.PartidasJugadas)
                .HasForeignKey(e => e.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.PartidaId, e.Posicion })
                .IsUnique();
        });
    }
}