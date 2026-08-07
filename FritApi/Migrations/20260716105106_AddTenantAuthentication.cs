using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantAuthentication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EsUsuarioExterno",
                table: "Usuarios",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                "UPDATE \"Usuarios\" SET \"EsUsuarioExterno\" = TRUE " +
                "WHERE \"TenantId\" = 1 AND (\"UsuarioId\" = 16 OR LOWER(\"Nombre\") = 'extern')");

            migrationBuilder.AddColumn<string>(
                name: "CodiRegistreHash",
                table: "Tenants",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EsUsuarioExterno",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "CodiRegistreHash",
                table: "Tenants");
        }
    }
}
