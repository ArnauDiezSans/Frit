using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddExternalAttendanceNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CineValoraciones_Usuarios_UsuarioId",
                table: "CineValoraciones");

            migrationBuilder.DropForeignKey(
                name: "FK_CsopaAssistencies_Usuarios_UsuarioId",
                table: "CsopaAssistencies");

            migrationBuilder.AlterColumn<int>(
                name: "UsuarioId",
                table: "CsopaAssistencies",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "NombreMostrado",
                table: "CsopaAssistencies",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "UsuarioId",
                table: "CineValoraciones",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "NombreMostrado",
                table: "CineValoraciones",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CineValoraciones_Usuarios_UsuarioId",
                table: "CineValoraciones",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuarioId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_CsopaAssistencies_Usuarios_UsuarioId",
                table: "CsopaAssistencies",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuarioId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CineValoraciones_Usuarios_UsuarioId",
                table: "CineValoraciones");

            migrationBuilder.DropForeignKey(
                name: "FK_CsopaAssistencies_Usuarios_UsuarioId",
                table: "CsopaAssistencies");

            migrationBuilder.DropColumn(
                name: "NombreMostrado",
                table: "CsopaAssistencies");

            migrationBuilder.DropColumn(
                name: "NombreMostrado",
                table: "CineValoraciones");

            migrationBuilder.AlterColumn<int>(
                name: "UsuarioId",
                table: "CsopaAssistencies",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "UsuarioId",
                table: "CineValoraciones",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CineValoraciones_Usuarios_UsuarioId",
                table: "CineValoraciones",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuarioId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_CsopaAssistencies_Usuarios_UsuarioId",
                table: "CsopaAssistencies",
                column: "UsuarioId",
                principalTable: "Usuarios",
                principalColumn: "UsuarioId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
