using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddCsopa : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CsopaActivitats",
                columns: table => new
                {
                    CsopaActivitatId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Titol = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Tipus = table.Column<int>(type: "integer", nullable: false),
                    UsuarioCreadorId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CsopaActivitats", x => x.CsopaActivitatId);
                    table.ForeignKey(
                        name: "FK_CsopaActivitats_Usuarios_UsuarioCreadorId",
                        column: x => x.UsuarioCreadorId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CsopaAssistencies",
                columns: table => new
                {
                    CsopaAssistenciaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CsopaActivitatId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CsopaAssistencies", x => x.CsopaAssistenciaId);
                    table.ForeignKey(
                        name: "FK_CsopaAssistencies_CsopaActivitats_CsopaActivitatId",
                        column: x => x.CsopaActivitatId,
                        principalTable: "CsopaActivitats",
                        principalColumn: "CsopaActivitatId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CsopaAssistencies_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CsopaActivitats_CreatedAt",
                table: "CsopaActivitats",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CsopaActivitats_Tipus",
                table: "CsopaActivitats",
                column: "Tipus");

            migrationBuilder.CreateIndex(
                name: "IX_CsopaActivitats_UsuarioCreadorId",
                table: "CsopaActivitats",
                column: "UsuarioCreadorId");

            migrationBuilder.CreateIndex(
                name: "IX_CsopaAssistencies_CsopaActivitatId_UsuarioId",
                table: "CsopaAssistencies",
                columns: new[] { "CsopaActivitatId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CsopaAssistencies_UsuarioId",
                table: "CsopaAssistencies",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CsopaAssistencies");

            migrationBuilder.DropTable(
                name: "CsopaActivitats");
        }
    }
}
