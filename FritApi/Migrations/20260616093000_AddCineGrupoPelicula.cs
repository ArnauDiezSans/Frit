using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    public partial class AddCineGrupoPelicula : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Grupo_pelicula",
                table: "CinePeliculas",
                type: "integer",
                nullable: true);

            migrationBuilder.Sql("UPDATE \"CinePeliculas\" SET \"Grupo_pelicula\" = 1 WHERE \"Grupo_pelicula\" IS NULL;");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Grupo_pelicula",
                table: "CinePeliculas");
        }
    }
}
