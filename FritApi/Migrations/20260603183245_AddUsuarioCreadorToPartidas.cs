using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddUsuarioCreadorToPartidas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UsuarioCreadorId",
                table: "Partidas",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Partidas_UsuarioCreadorId",
                table: "Partidas",
                column: "UsuarioCreadorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Partidas_Usuarios_UsuarioCreadorId",
                table: "Partidas",
                column: "UsuarioCreadorId",
                principalTable: "Usuarios",
                principalColumn: "UsuarioId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Partidas_Usuarios_UsuarioCreadorId",
                table: "Partidas");

            migrationBuilder.DropIndex(
                name: "IX_Partidas_UsuarioCreadorId",
                table: "Partidas");

            migrationBuilder.DropColumn(
                name: "UsuarioCreadorId",
                table: "Partidas");
        }
    }
}
