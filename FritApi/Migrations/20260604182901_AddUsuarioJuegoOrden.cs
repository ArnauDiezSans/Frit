using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioJuegoOrden : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UsuarioJuegoOrdenes",
                columns: table => new
                {
                    UsuarioJuegoOrdenId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    JuegoId = table.Column<int>(type: "integer", nullable: false),
                    Posicion = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UsuarioJuegoOrdenes", x => x.UsuarioJuegoOrdenId);
                    table.ForeignKey(
                        name: "FK_UsuarioJuegoOrdenes_Juegos_JuegoId",
                        column: x => x.JuegoId,
                        principalTable: "Juegos",
                        principalColumn: "JuegoId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UsuarioJuegoOrdenes_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioJuegoOrdenes_JuegoId",
                table: "UsuarioJuegoOrdenes",
                column: "JuegoId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioJuegoOrdenes_UsuarioId_JuegoId",
                table: "UsuarioJuegoOrdenes",
                columns: new[] { "UsuarioId", "JuegoId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioJuegoOrdenes_UsuarioId_Posicion",
                table: "UsuarioJuegoOrdenes",
                columns: new[] { "UsuarioId", "Posicion" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UsuarioJuegoOrdenes");
        }
    }
}
