using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddSurveyUserOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PermiteAgregarOpciones",
                table: "EncuestaPreguntas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "UsuarioCreadorId",
                table: "EncuestaOpciones",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaOpciones_UsuarioCreadorId",
                table: "EncuestaOpciones",
                column: "UsuarioCreadorId");

            migrationBuilder.AddForeignKey(
                name: "FK_EncuestaOpciones_Usuarios_UsuarioCreadorId",
                table: "EncuestaOpciones",
                column: "UsuarioCreadorId",
                principalTable: "Usuarios",
                principalColumn: "UsuarioId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EncuestaOpciones_Usuarios_UsuarioCreadorId",
                table: "EncuestaOpciones");

            migrationBuilder.DropIndex(
                name: "IX_EncuestaOpciones_UsuarioCreadorId",
                table: "EncuestaOpciones");

            migrationBuilder.DropColumn(
                name: "PermiteAgregarOpciones",
                table: "EncuestaPreguntas");

            migrationBuilder.DropColumn(
                name: "UsuarioCreadorId",
                table: "EncuestaOpciones");
        }
    }
}
