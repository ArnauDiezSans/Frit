using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class MakeUserNamesGloballyUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Usuarios_TenantId_Nombre",
                table: "Usuarios");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Nombre",
                table: "Usuarios",
                column: "Nombre",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Usuarios_Nombre",
                table: "Usuarios");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_TenantId_Nombre",
                table: "Usuarios",
                columns: new[] { "TenantId", "Nombre" },
                unique: true);
        }
    }
}
