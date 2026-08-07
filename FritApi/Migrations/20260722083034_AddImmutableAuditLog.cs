using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddImmutableAuditLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AuditAuthorizedUsers",
                columns: table => new
                {
                    UsuarioId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditAuthorizedUsers", x => x.UsuarioId);
                    table.ForeignKey(
                        name: "FK_AuditAuthorizedUsers_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.Sql(
                """
                INSERT INTO "AuditAuthorizedUsers" ("UsuarioId")
                SELECT "UsuarioId"
                FROM "Usuarios"
                WHERE "Nombre" = 'Arnau'
                ON CONFLICT ("UsuarioId") DO NOTHING;
                """);

            migrationBuilder.CreateTable(
                name: "AuditEntries",
                columns: table => new
                {
                    AuditEntryId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioNombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Ip = table.Column<string>(type: "character varying(45)", maxLength: 45, nullable: true),
                    Entidad = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    RegistroId = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Accion = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ValoresAnteriores = table.Column<string>(type: "text", nullable: true),
                    ValoresNuevos = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AuditEntries", x => x.AuditEntryId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntries_TenantId_CreatedAt",
                table: "AuditEntries",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntries_TenantId_Entidad",
                table: "AuditEntries",
                columns: new[] { "TenantId", "Entidad" });

            migrationBuilder.CreateIndex(
                name: "IX_AuditEntries_TenantId_UsuarioId",
                table: "AuditEntries",
                columns: new[] { "TenantId", "UsuarioId" });

            migrationBuilder.Sql(
                """
                CREATE FUNCTION prevent_audit_entry_changes()
                RETURNS trigger AS $$
                BEGIN
                    RAISE EXCEPTION 'Les entrades d''auditoria són immutables.';
                END;
                $$ LANGUAGE plpgsql;

                CREATE TRIGGER audit_entries_immutable
                BEFORE UPDATE OR DELETE ON "AuditEntries"
                FOR EACH ROW EXECUTE FUNCTION prevent_audit_entry_changes();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditAuthorizedUsers");

            migrationBuilder.DropTable(
                name: "AuditEntries");

            migrationBuilder.Sql("DROP FUNCTION IF EXISTS prevent_audit_entry_changes();");
        }
    }
}
