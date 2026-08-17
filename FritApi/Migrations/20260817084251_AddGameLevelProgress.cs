using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddGameLevelProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "TieneProgresoNiveles",
                table: "Juegos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "JuegoProgresoJugadores",
                columns: table => new
                {
                    JuegoProgresoJugadorId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    JuegoId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: true),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    EsVisita = table.Column<bool>(type: "boolean", nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JuegoProgresoJugadores", x => x.JuegoProgresoJugadorId);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoJugadores_Juegos_JuegoId",
                        column: x => x.JuegoId,
                        principalTable: "Juegos",
                        principalColumn: "JuegoId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoJugadores_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoJugadores_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "JuegoProgresoNiveles",
                columns: table => new
                {
                    JuegoProgresoNivelId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    JuegoId = table.Column<int>(type: "integer", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JuegoProgresoNiveles", x => x.JuegoProgresoNivelId);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoNiveles_Juegos_JuegoId",
                        column: x => x.JuegoId,
                        principalTable: "Juegos",
                        principalColumn: "JuegoId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoNiveles_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "JuegoProgresoMarcas",
                columns: table => new
                {
                    JuegoProgresoMarcaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    JuegoProgresoJugadorId = table.Column<int>(type: "integer", nullable: false),
                    JuegoProgresoNivelId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JuegoProgresoMarcas", x => x.JuegoProgresoMarcaId);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoMarcas_JuegoProgresoJugadores_JuegoProgresoJug~",
                        column: x => x.JuegoProgresoJugadorId,
                        principalTable: "JuegoProgresoJugadores",
                        principalColumn: "JuegoProgresoJugadorId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoMarcas_JuegoProgresoNiveles_JuegoProgresoNivel~",
                        column: x => x.JuegoProgresoNivelId,
                        principalTable: "JuegoProgresoNiveles",
                        principalColumn: "JuegoProgresoNivelId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_JuegoProgresoMarcas_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoJugadores_JuegoId_Orden",
                table: "JuegoProgresoJugadores",
                columns: new[] { "JuegoId", "Orden" });

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoJugadores_JuegoId_UsuarioId",
                table: "JuegoProgresoJugadores",
                columns: new[] { "JuegoId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoJugadores_TenantId",
                table: "JuegoProgresoJugadores",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoJugadores_UsuarioId",
                table: "JuegoProgresoJugadores",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoMarcas_JuegoProgresoJugadorId_JuegoProgresoNiv~",
                table: "JuegoProgresoMarcas",
                columns: new[] { "JuegoProgresoJugadorId", "JuegoProgresoNivelId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoMarcas_JuegoProgresoNivelId",
                table: "JuegoProgresoMarcas",
                column: "JuegoProgresoNivelId");

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoMarcas_TenantId",
                table: "JuegoProgresoMarcas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoNiveles_JuegoId_Orden",
                table: "JuegoProgresoNiveles",
                columns: new[] { "JuegoId", "Orden" });

            migrationBuilder.CreateIndex(
                name: "IX_JuegoProgresoNiveles_TenantId",
                table: "JuegoProgresoNiveles",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JuegoProgresoMarcas");

            migrationBuilder.DropTable(
                name: "JuegoProgresoJugadores");

            migrationBuilder.DropTable(
                name: "JuegoProgresoNiveles");

            migrationBuilder.DropColumn(
                name: "TieneProgresoNiveles",
                table: "Juegos");
        }
    }
}
