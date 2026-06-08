using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceUsuarioJuegoOrdenPosicionWithPuntuacion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UsuarioJuegoOrdenes_UsuarioId_Posicion",
                table: "UsuarioJuegoOrdenes");

            migrationBuilder.RenameColumn(
                name: "Posicion",
                table: "UsuarioJuegoOrdenes",
                newName: "Puntuacion");

            migrationBuilder.Sql("""
                UPDATE public."UsuarioJuegoOrdenes"
                SET "Puntuacion" = 0;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Puntuacion",
                table: "UsuarioJuegoOrdenes",
                newName: "Posicion");

            migrationBuilder.Sql("""
                UPDATE public."UsuarioJuegoOrdenes" orden
                SET "Posicion" = ranked."NewPosition"
                FROM (
                    SELECT
                        "UsuarioJuegoOrdenId",
                        ROW_NUMBER() OVER (
                            PARTITION BY "UsuarioId"
                            ORDER BY "UsuarioJuegoOrdenId"
                        ) AS "NewPosition"
                    FROM public."UsuarioJuegoOrdenes"
                ) ranked
                WHERE orden."UsuarioJuegoOrdenId" = ranked."UsuarioJuegoOrdenId";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioJuegoOrdenes_UsuarioId_Posicion",
                table: "UsuarioJuegoOrdenes",
                columns: new[] { "UsuarioId", "Posicion" },
                unique: true);
        }
    }
}
