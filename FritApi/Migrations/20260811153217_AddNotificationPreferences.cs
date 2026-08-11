using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationPreferences",
                columns: table => new
                {
                    NotificationPreferenceId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    NuevaPartida = table.Column<bool>(type: "boolean", nullable: false),
                    NuevaRemada = table.Column<bool>(type: "boolean", nullable: false),
                    Encuesta = table.Column<bool>(type: "boolean", nullable: false),
                    CambioPreferenciaJuego = table.Column<bool>(type: "boolean", nullable: false),
                    PuntuacionMinima = table.Column<int>(type: "integer", nullable: false, defaultValue: 10),
                    RecordatorioDomingo = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationPreferences", x => x.NotificationPreferenceId);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NotificationPreferences_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                INSERT INTO "NotificationPreferences"
                    ("TenantId", "UsuarioId", "NuevaPartida", "NuevaRemada", "Encuesta",
                     "CambioPreferenciaJuego", "PuntuacionMinima", "RecordatorioDomingo", "CreatedAt", "UpdatedAt")
                SELECT "TenantId", "UsuarioId", FALSE, FALSE, FALSE, FALSE, 10, FALSE, NOW(), NOW()
                FROM "Usuarios";
                """);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_TenantId",
                table: "NotificationPreferences",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_TenantId_UsuarioId",
                table: "NotificationPreferences",
                columns: new[] { "TenantId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NotificationPreferences_UsuarioId",
                table: "NotificationPreferences",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationPreferences");
        }
    }
}
