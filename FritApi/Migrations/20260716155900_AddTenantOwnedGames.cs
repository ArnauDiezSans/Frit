using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantOwnedGames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsPropiedadTenant",
                table: "Juegos",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EsPropiedadTenant",
                table: "Juegos");
        }
    }
}
