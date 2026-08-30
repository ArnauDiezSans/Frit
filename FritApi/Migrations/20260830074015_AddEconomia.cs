using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEconomia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EconomiaMoviments",
                columns: table => new
                {
                    EconomiaMovimentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    Data = table.Column<DateOnly>(type: "date", nullable: false),
                    DataValor = table.Column<DateOnly>(type: "date", nullable: false),
                    DescriptorOriginal = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Descriptor = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Import = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Saldo = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: true),
                    Empremta = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EconomiaMoviments", x => x.EconomiaMovimentId);
                    table.ForeignKey(
                        name: "FK_EconomiaMoviments_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EconomiaImputacions",
                columns: table => new
                {
                    EconomiaImputacioId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EconomiaMovimentId = table.Column<int>(type: "integer", nullable: true),
                    Categoria = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Persona = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Periode = table.Column<DateOnly>(type: "date", nullable: true),
                    Import = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    Descriptor = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RequereixRevisio = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EconomiaImputacions", x => x.EconomiaImputacioId);
                    table.ForeignKey(
                        name: "FK_EconomiaImputacions_EconomiaMoviments_EconomiaMovimentId",
                        column: x => x.EconomiaMovimentId,
                        principalTable: "EconomiaMoviments",
                        principalColumn: "EconomiaMovimentId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EconomiaImputacions_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EconomiaImputacions_EconomiaMovimentId",
                table: "EconomiaImputacions",
                column: "EconomiaMovimentId");

            migrationBuilder.CreateIndex(
                name: "IX_EconomiaImputacions_TenantId",
                table: "EconomiaImputacions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EconomiaImputacions_TenantId_Periode_Persona",
                table: "EconomiaImputacions",
                columns: new[] { "TenantId", "Periode", "Persona" });

            migrationBuilder.CreateIndex(
                name: "IX_EconomiaMoviments_TenantId",
                table: "EconomiaMoviments",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EconomiaMoviments_TenantId_Data",
                table: "EconomiaMoviments",
                columns: new[] { "TenantId", "Data" });

            migrationBuilder.CreateIndex(
                name: "IX_EconomiaMoviments_TenantId_Empremta",
                table: "EconomiaMoviments",
                columns: new[] { "TenantId", "Empremta" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EconomiaImputacions");

            migrationBuilder.DropTable(
                name: "EconomiaMoviments");
        }
    }
}
