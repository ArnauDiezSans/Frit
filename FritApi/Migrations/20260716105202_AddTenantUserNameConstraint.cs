using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantUserNameConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_TenantId_Nombre",
                table: "Usuarios",
                columns: new[] { "TenantId", "Nombre" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Usuarios_TenantId_Nombre",
                table: "Usuarios");
        }
    }
}
