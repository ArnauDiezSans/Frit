using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddRemades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Remades",
                columns: table => new
                {
                    RemadaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioCreadorId = table.Column<int>(type: "integer", nullable: false),
                    TempsDisponibleMinuts = table.Column<int>(type: "integer", nullable: false),
                    NombreJocs = table.Column<int>(type: "integer", nullable: false),
                    PuntsPerJugador = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Remades", x => x.RemadaId);
                    table.ForeignKey(
                        name: "FK_Remades_Usuarios_UsuarioCreadorId",
                        column: x => x.UsuarioCreadorId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "RemadaJocs",
                columns: table => new
                {
                    RemadaJuegoId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RemadaId = table.Column<int>(type: "integer", nullable: false),
                    JuegoId = table.Column<int>(type: "integer", nullable: false),
                    JuegoNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Posicion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RemadaJocs", x => x.RemadaJuegoId);
                    table.ForeignKey(
                        name: "FK_RemadaJocs_Juegos_JuegoId",
                        column: x => x.JuegoId,
                        principalTable: "Juegos",
                        principalColumn: "JuegoId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RemadaJocs_Remades_RemadaId",
                        column: x => x.RemadaId,
                        principalTable: "Remades",
                        principalColumn: "RemadaId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RemadaJugadors",
                columns: table => new
                {
                    RemadaJugadorId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RemadaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Punts = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RemadaJugadors", x => x.RemadaJugadorId);
                    table.ForeignKey(
                        name: "FK_RemadaJugadors_Remades_RemadaId",
                        column: x => x.RemadaId,
                        principalTable: "Remades",
                        principalColumn: "RemadaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RemadaJugadors_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RemadaJocs_JuegoId",
                table: "RemadaJocs",
                column: "JuegoId");

            migrationBuilder.CreateIndex(
                name: "IX_RemadaJocs_RemadaId_JuegoId",
                table: "RemadaJocs",
                columns: new[] { "RemadaId", "JuegoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RemadaJugadors_RemadaId_UsuarioId",
                table: "RemadaJugadors",
                columns: new[] { "RemadaId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RemadaJugadors_UsuarioId",
                table: "RemadaJugadors",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Remades_CreatedAt",
                table: "Remades",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Remades_UsuarioCreadorId",
                table: "Remades",
                column: "UsuarioCreadorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RemadaJocs");

            migrationBuilder.DropTable(
                name: "RemadaJugadors");

            migrationBuilder.DropTable(
                name: "Remades");
        }
    }
}
