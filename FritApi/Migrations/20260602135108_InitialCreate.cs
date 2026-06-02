using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    UsuarioId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Grupo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Observaciones = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: true),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.UsuarioId);
                });

            migrationBuilder.CreateTable(
                name: "Juegos",
                columns: table => new
                {
                    JuegoId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    BggId = table.Column<int>(type: "integer", nullable: true),
                    DificultadBgg = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true),
                    NumeroJugadoresMin = table.Column<int>(type: "integer", nullable: false),
                    NumeroJugadoresMax = table.Column<int>(type: "integer", nullable: false),
                    Pvp = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    PropietarioId = table.Column<int>(type: "integer", nullable: false),
                    FechaAdquisicion = table.Column<DateOnly>(type: "date", nullable: true),
                    Tipo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    JuegoBaseId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Juegos", x => x.JuegoId);
                    table.ForeignKey(
                        name: "FK_Juegos_Juegos_JuegoBaseId",
                        column: x => x.JuegoBaseId,
                        principalTable: "Juegos",
                        principalColumn: "JuegoId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Juegos_Usuarios_PropietarioId",
                        column: x => x.PropietarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Partidas",
                columns: table => new
                {
                    PartidaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JuegoId = table.Column<int>(type: "integer", nullable: false),
                    Fecha = table.Column<DateOnly>(type: "date", nullable: false),
                    DuracionMinutos = table.Column<int>(type: "integer", nullable: true),
                    NumeroJugadores = table.Column<int>(type: "integer", nullable: false),
                    Observaciones = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Partidas", x => x.PartidaId);
                    table.ForeignKey(
                        name: "FK_Partidas_Juegos_JuegoId",
                        column: x => x.JuegoId,
                        principalTable: "Juegos",
                        principalColumn: "JuegoId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PartidaJugadores",
                columns: table => new
                {
                    PartidaJugadorId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PartidaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: true),
                    NombreMostrado = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Posicion = table.Column<int>(type: "integer", nullable: false),
                    Puntos = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PartidaJugadores", x => x.PartidaJugadorId);
                    table.ForeignKey(
                        name: "FK_PartidaJugadores_Partidas_PartidaId",
                        column: x => x.PartidaId,
                        principalTable: "Partidas",
                        principalColumn: "PartidaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PartidaJugadores_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Juegos_JuegoBaseId",
                table: "Juegos",
                column: "JuegoBaseId");

            migrationBuilder.CreateIndex(
                name: "IX_Juegos_PropietarioId",
                table: "Juegos",
                column: "PropietarioId");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaJugadores_PartidaId_Posicion",
                table: "PartidaJugadores",
                columns: new[] { "PartidaId", "Posicion" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PartidaJugadores_UsuarioId",
                table: "PartidaJugadores",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Partidas_JuegoId",
                table: "Partidas",
                column: "JuegoId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PartidaJugadores");

            migrationBuilder.DropTable(
                name: "Partidas");

            migrationBuilder.DropTable(
                name: "Juegos");

            migrationBuilder.DropTable(
                name: "Usuarios");
        }
    }
}
