using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AllowDuplicatePartidaJugadorPositions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PartidaJugadores_PartidaId_Posicion",
                table: "PartidaJugadores");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaJugadores_PartidaId_Posicion",
                table: "PartidaJugadores",
                columns: new[] { "PartidaId", "Posicion" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PartidaJugadores_PartidaId_Posicion",
                table: "PartidaJugadores");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaJugadores_PartidaId_Posicion",
                table: "PartidaJugadores",
                columns: new[] { "PartidaId", "Posicion" },
                unique: true);
        }
    }
}
