using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveTenantRegistrationCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodiRegistreHash",
                table: "Tenants");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CodiRegistreHash",
                table: "Tenants",
                type: "text",
                nullable: true);
        }
    }
}
