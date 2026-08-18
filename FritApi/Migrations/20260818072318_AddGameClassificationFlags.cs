using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddGameClassificationFlags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsCooperativo",
                table: "Juegos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EsNoLista",
                table: "Juegos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EsPorEquipos",
                table: "Juegos",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE "Juegos"
                SET "EsCooperativo" = lower(coalesce("Tipo", '')) LIKE '%cooperatiu%',
                    "EsPorEquipos" = lower(coalesce("Tipo", '')) LIKE '%equips%',
                    "EsNoLista" = lower(coalesce("Tipo", '')) LIKE '%no llista%';

                UPDATE "Juegos" AS juego
                SET "Tipo" = cleaned."Tipo"
                FROM (
                    SELECT "JuegoId",
                           array_to_string(
                               ARRAY(
                                   SELECT trim(category)
                                   FROM unnest(string_to_array(coalesce("Tipo", ''), ',')) AS category
                                   WHERE lower(trim(category)) NOT IN ('cooperatiu', 'equips', 'no llista')
                               ),
                               ', '
                           ) AS "Tipo"
                    FROM "Juegos"
                ) AS cleaned
                WHERE juego."JuegoId" = cleaned."JuegoId";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EsCooperativo",
                table: "Juegos");

            migrationBuilder.DropColumn(
                name: "EsNoLista",
                table: "Juegos");

            migrationBuilder.DropColumn(
                name: "EsPorEquipos",
                table: "Juegos");
        }
    }
}
