using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiTenantFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Usuarios",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "UsuarioJuegoOrdenes",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Remades",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "RemadaJugadors",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "RemadaJocs",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PendentsCompra",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Partidas",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "PartidaJugadores",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "ManualMedallaUsuarios",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "ManualMedallas",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "Juegos",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "CsopaAssistencies",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "CsopaActivitats",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "CineValoraciones",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "TenantId",
                table: "CinePeliculas",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "Tenants",
                columns: table => new
                {
                    TenantId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codi = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Nom = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Actiu = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tenants", x => x.TenantId);
                });

            migrationBuilder.InsertData(
                table: "Tenants",
                columns: new[] { "TenantId", "Codi", "Nom", "Actiu", "CreatedAt" },
                values: new object[] { 1, "frit14", "Frit14", true, DateTime.UnixEpoch });

            migrationBuilder.Sql(
                "SELECT setval(pg_get_serial_sequence('\"Tenants\"', 'TenantId'), " +
                "GREATEST((SELECT MAX(\"TenantId\") FROM \"Tenants\"), 1));");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_TenantId",
                table: "Usuarios",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_UsuarioJuegoOrdenes_TenantId",
                table: "UsuarioJuegoOrdenes",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Remades_TenantId",
                table: "Remades",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_RemadaJugadors_TenantId",
                table: "RemadaJugadors",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_RemadaJocs_TenantId",
                table: "RemadaJocs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PendentsCompra_TenantId",
                table: "PendentsCompra",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Partidas_TenantId",
                table: "Partidas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_PartidaJugadores_TenantId",
                table: "PartidaJugadores",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ManualMedallaUsuarios_TenantId",
                table: "ManualMedallaUsuarios",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ManualMedallas_TenantId",
                table: "ManualMedallas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Juegos_TenantId",
                table: "Juegos",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CsopaAssistencies_TenantId",
                table: "CsopaAssistencies",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CsopaActivitats_TenantId",
                table: "CsopaActivitats",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CineValoraciones_TenantId",
                table: "CineValoraciones",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_CinePeliculas_TenantId",
                table: "CinePeliculas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_Codi",
                table: "Tenants",
                column: "Codi",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CinePeliculas_Tenants_TenantId",
                table: "CinePeliculas",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CineValoraciones_Tenants_TenantId",
                table: "CineValoraciones",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CsopaActivitats_Tenants_TenantId",
                table: "CsopaActivitats",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_CsopaAssistencies_Tenants_TenantId",
                table: "CsopaAssistencies",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Juegos_Tenants_TenantId",
                table: "Juegos",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ManualMedallas_Tenants_TenantId",
                table: "ManualMedallas",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ManualMedallaUsuarios_Tenants_TenantId",
                table: "ManualMedallaUsuarios",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PartidaJugadores_Tenants_TenantId",
                table: "PartidaJugadores",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Partidas_Tenants_TenantId",
                table: "Partidas",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PendentsCompra_Tenants_TenantId",
                table: "PendentsCompra",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RemadaJocs_Tenants_TenantId",
                table: "RemadaJocs",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RemadaJugadors_Tenants_TenantId",
                table: "RemadaJugadors",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Remades_Tenants_TenantId",
                table: "Remades",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UsuarioJuegoOrdenes_Tenants_TenantId",
                table: "UsuarioJuegoOrdenes",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Usuarios_Tenants_TenantId",
                table: "Usuarios",
                column: "TenantId",
                principalTable: "Tenants",
                principalColumn: "TenantId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql("""
                ALTER TABLE "Usuarios" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "UsuarioJuegoOrdenes" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "Remades" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "RemadaJugadors" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "RemadaJocs" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "PendentsCompra" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "Partidas" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "PartidaJugadores" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "ManualMedallaUsuarios" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "ManualMedallas" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "Juegos" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "CsopaAssistencies" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "CsopaActivitats" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "CineValoraciones" ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE "CinePeliculas" ALTER COLUMN "TenantId" DROP DEFAULT;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CinePeliculas_Tenants_TenantId",
                table: "CinePeliculas");

            migrationBuilder.DropForeignKey(
                name: "FK_CineValoraciones_Tenants_TenantId",
                table: "CineValoraciones");

            migrationBuilder.DropForeignKey(
                name: "FK_CsopaActivitats_Tenants_TenantId",
                table: "CsopaActivitats");

            migrationBuilder.DropForeignKey(
                name: "FK_CsopaAssistencies_Tenants_TenantId",
                table: "CsopaAssistencies");

            migrationBuilder.DropForeignKey(
                name: "FK_Juegos_Tenants_TenantId",
                table: "Juegos");

            migrationBuilder.DropForeignKey(
                name: "FK_ManualMedallas_Tenants_TenantId",
                table: "ManualMedallas");

            migrationBuilder.DropForeignKey(
                name: "FK_ManualMedallaUsuarios_Tenants_TenantId",
                table: "ManualMedallaUsuarios");

            migrationBuilder.DropForeignKey(
                name: "FK_PartidaJugadores_Tenants_TenantId",
                table: "PartidaJugadores");

            migrationBuilder.DropForeignKey(
                name: "FK_Partidas_Tenants_TenantId",
                table: "Partidas");

            migrationBuilder.DropForeignKey(
                name: "FK_PendentsCompra_Tenants_TenantId",
                table: "PendentsCompra");

            migrationBuilder.DropForeignKey(
                name: "FK_RemadaJocs_Tenants_TenantId",
                table: "RemadaJocs");

            migrationBuilder.DropForeignKey(
                name: "FK_RemadaJugadors_Tenants_TenantId",
                table: "RemadaJugadors");

            migrationBuilder.DropForeignKey(
                name: "FK_Remades_Tenants_TenantId",
                table: "Remades");

            migrationBuilder.DropForeignKey(
                name: "FK_UsuarioJuegoOrdenes_Tenants_TenantId",
                table: "UsuarioJuegoOrdenes");

            migrationBuilder.DropForeignKey(
                name: "FK_Usuarios_Tenants_TenantId",
                table: "Usuarios");

            migrationBuilder.DropTable(
                name: "Tenants");

            migrationBuilder.DropIndex(
                name: "IX_Usuarios_TenantId",
                table: "Usuarios");

            migrationBuilder.DropIndex(
                name: "IX_UsuarioJuegoOrdenes_TenantId",
                table: "UsuarioJuegoOrdenes");

            migrationBuilder.DropIndex(
                name: "IX_Remades_TenantId",
                table: "Remades");

            migrationBuilder.DropIndex(
                name: "IX_RemadaJugadors_TenantId",
                table: "RemadaJugadors");

            migrationBuilder.DropIndex(
                name: "IX_RemadaJocs_TenantId",
                table: "RemadaJocs");

            migrationBuilder.DropIndex(
                name: "IX_PendentsCompra_TenantId",
                table: "PendentsCompra");

            migrationBuilder.DropIndex(
                name: "IX_Partidas_TenantId",
                table: "Partidas");

            migrationBuilder.DropIndex(
                name: "IX_PartidaJugadores_TenantId",
                table: "PartidaJugadores");

            migrationBuilder.DropIndex(
                name: "IX_ManualMedallaUsuarios_TenantId",
                table: "ManualMedallaUsuarios");

            migrationBuilder.DropIndex(
                name: "IX_ManualMedallas_TenantId",
                table: "ManualMedallas");

            migrationBuilder.DropIndex(
                name: "IX_Juegos_TenantId",
                table: "Juegos");

            migrationBuilder.DropIndex(
                name: "IX_CsopaAssistencies_TenantId",
                table: "CsopaAssistencies");

            migrationBuilder.DropIndex(
                name: "IX_CsopaActivitats_TenantId",
                table: "CsopaActivitats");

            migrationBuilder.DropIndex(
                name: "IX_CineValoraciones_TenantId",
                table: "CineValoraciones");

            migrationBuilder.DropIndex(
                name: "IX_CinePeliculas_TenantId",
                table: "CinePeliculas");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "UsuarioJuegoOrdenes");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Remades");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "RemadaJugadors");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "RemadaJocs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PendentsCompra");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Partidas");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "PartidaJugadores");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ManualMedallaUsuarios");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ManualMedallas");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Juegos");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CsopaAssistencies");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CsopaActivitats");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CineValoraciones");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "CinePeliculas");
        }
    }
}

