using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddManualMedallas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ManualMedallas",
                columns: table => new
                {
                    ManualMedallaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    IconPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManualMedallas", x => x.ManualMedallaId);
                });

            migrationBuilder.CreateTable(
                name: "ManualMedallaUsuarios",
                columns: table => new
                {
                    ManualMedallaUsuarioId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ManualMedallaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManualMedallaUsuarios", x => x.ManualMedallaUsuarioId);
                    table.ForeignKey(
                        name: "FK_ManualMedallaUsuarios_ManualMedallas_ManualMedallaId",
                        column: x => x.ManualMedallaId,
                        principalTable: "ManualMedallas",
                        principalColumn: "ManualMedallaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ManualMedallaUsuarios_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManualMedallaUsuarios_ManualMedallaId_UsuarioId",
                table: "ManualMedallaUsuarios",
                columns: new[] { "ManualMedallaId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManualMedallaUsuarios_UsuarioId",
                table: "ManualMedallaUsuarios",
                column: "UsuarioId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManualMedallaUsuarios");

            migrationBuilder.DropTable(
                name: "ManualMedallas");
        }
    }
}
