using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEncuestaConditionalQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CondicionOpcionOrden",
                table: "EncuestaPreguntas",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CondicionPreguntaOrden",
                table: "EncuestaPreguntas",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CondicionOpcionOrden",
                table: "EncuestaPreguntas");

            migrationBuilder.DropColumn(
                name: "CondicionPreguntaOrden",
                table: "EncuestaPreguntas");
        }
    }
}
