using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCine : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CinePeliculas",
                columns: table => new
                {
                    CinePeliculaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Titulo = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    UsuarioCreadorId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CinePeliculas", x => x.CinePeliculaId);
                    table.ForeignKey(
                        name: "FK_CinePeliculas_Usuarios_UsuarioCreadorId",
                        column: x => x.UsuarioCreadorId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CineValoraciones",
                columns: table => new
                {
                    CineValoracionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CinePeliculaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    Nota = table.Column<int>(type: "integer", nullable: false),
                    Observacion = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CineValoraciones", x => x.CineValoracionId);
                    table.ForeignKey(
                        name: "FK_CineValoraciones_CinePeliculas_CinePeliculaId",
                        column: x => x.CinePeliculaId,
                        principalTable: "CinePeliculas",
                        principalColumn: "CinePeliculaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CineValoraciones_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CinePeliculas_CreatedAt",
                table: "CinePeliculas",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CinePeliculas_UsuarioCreadorId",
                table: "CinePeliculas",
                column: "UsuarioCreadorId");

            migrationBuilder.CreateIndex(
                name: "IX_CineValoraciones_CinePeliculaId_UsuarioId",
                table: "CineValoraciones",
                columns: new[] { "CinePeliculaId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CineValoraciones_UsuarioId",
                table: "CineValoraciones",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CineValoraciones");

            migrationBuilder.DropTable(
                name: "CinePeliculas");
        }
    }
}
