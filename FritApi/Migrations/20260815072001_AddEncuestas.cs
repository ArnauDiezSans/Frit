using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddEncuestas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Encuestas",
                columns: table => new
                {
                    EncuestaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioCreadorId = table.Column<int>(type: "integer", nullable: false),
                    Titulo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Descripcion = table.Column<string>(type: "character varying(1200)", maxLength: 1200, nullable: true),
                    Estado = table.Column<int>(type: "integer", nullable: false),
                    EsAnonima = table.Column<bool>(type: "boolean", nullable: false),
                    PermiteEditarRespuesta = table.Column<bool>(type: "boolean", nullable: false),
                    VisibilidadResultados = table.Column<int>(type: "integer", nullable: false),
                    FechaCierre = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PublicadaAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encuestas", x => x.EncuestaId);
                    table.ForeignKey(
                        name: "FK_Encuestas_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Encuestas_Usuarios_UsuarioCreadorId",
                        column: x => x.UsuarioCreadorId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncuestaDestinatarios",
                columns: table => new
                {
                    EncuestaDestinatarioId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncuestaDestinatarios", x => x.EncuestaDestinatarioId);
                    table.ForeignKey(
                        name: "FK_EncuestaDestinatarios_Encuestas_EncuestaId",
                        column: x => x.EncuestaId,
                        principalTable: "Encuestas",
                        principalColumn: "EncuestaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EncuestaDestinatarios_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EncuestaDestinatarios_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "EncuestaPreguntas",
                columns: table => new
                {
                    EncuestaPreguntaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaId = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<int>(type: "integer", nullable: false),
                    Texto = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Ayuda = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: true),
                    Obligatoria = table.Column<bool>(type: "boolean", nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false),
                    Minimo = table.Column<int>(type: "integer", nullable: true),
                    Maximo = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncuestaPreguntas", x => x.EncuestaPreguntaId);
                    table.ForeignKey(
                        name: "FK_EncuestaPreguntas_Encuestas_EncuestaId",
                        column: x => x.EncuestaId,
                        principalTable: "Encuestas",
                        principalColumn: "EncuestaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EncuestaPreguntas_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncuestaRespuestas",
                columns: table => new
                {
                    EncuestaRespuestaId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaId = table.Column<int>(type: "integer", nullable: false),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncuestaRespuestas", x => x.EncuestaRespuestaId);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestas_Encuestas_EncuestaId",
                        column: x => x.EncuestaId,
                        principalTable: "Encuestas",
                        principalColumn: "EncuestaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestas_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestas_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "UsuarioId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncuestaOpciones",
                columns: table => new
                {
                    EncuestaOpcionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaPreguntaId = table.Column<int>(type: "integer", nullable: false),
                    Texto = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Orden = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncuestaOpciones", x => x.EncuestaOpcionId);
                    table.ForeignKey(
                        name: "FK_EncuestaOpciones_EncuestaPreguntas_EncuestaPreguntaId",
                        column: x => x.EncuestaPreguntaId,
                        principalTable: "EncuestaPreguntas",
                        principalColumn: "EncuestaPreguntaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EncuestaOpciones_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncuestaRespuestaValores",
                columns: table => new
                {
                    EncuestaRespuestaValorId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaRespuestaId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaPreguntaId = table.Column<int>(type: "integer", nullable: false),
                    Texto = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    Numero = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncuestaRespuestaValores", x => x.EncuestaRespuestaValorId);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestaValores_EncuestaPreguntas_EncuestaPregunta~",
                        column: x => x.EncuestaPreguntaId,
                        principalTable: "EncuestaPreguntas",
                        principalColumn: "EncuestaPreguntaId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestaValores_EncuestaRespuestas_EncuestaRespues~",
                        column: x => x.EncuestaRespuestaId,
                        principalTable: "EncuestaRespuestas",
                        principalColumn: "EncuestaRespuestaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestaValores_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncuestaRespuestaOpciones",
                columns: table => new
                {
                    EncuestaRespuestaOpcionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaRespuestaValorId = table.Column<int>(type: "integer", nullable: false),
                    EncuestaOpcionId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncuestaRespuestaOpciones", x => x.EncuestaRespuestaOpcionId);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestaOpciones_EncuestaOpciones_EncuestaOpcionId",
                        column: x => x.EncuestaOpcionId,
                        principalTable: "EncuestaOpciones",
                        principalColumn: "EncuestaOpcionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestaOpciones_EncuestaRespuestaValores_Encuesta~",
                        column: x => x.EncuestaRespuestaValorId,
                        principalTable: "EncuestaRespuestaValores",
                        principalColumn: "EncuestaRespuestaValorId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EncuestaRespuestaOpciones_Tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "Tenants",
                        principalColumn: "TenantId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaDestinatarios_EncuestaId_UsuarioId",
                table: "EncuestaDestinatarios",
                columns: new[] { "EncuestaId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaDestinatarios_TenantId",
                table: "EncuestaDestinatarios",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaDestinatarios_UsuarioId",
                table: "EncuestaDestinatarios",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaOpciones_EncuestaPreguntaId_Orden",
                table: "EncuestaOpciones",
                columns: new[] { "EncuestaPreguntaId", "Orden" });

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaOpciones_TenantId",
                table: "EncuestaOpciones",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaPreguntas_EncuestaId_Orden",
                table: "EncuestaPreguntas",
                columns: new[] { "EncuestaId", "Orden" });

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaPreguntas_TenantId",
                table: "EncuestaPreguntas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestaOpciones_EncuestaOpcionId",
                table: "EncuestaRespuestaOpciones",
                column: "EncuestaOpcionId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestaOpciones_EncuestaRespuestaValorId_Encuesta~",
                table: "EncuestaRespuestaOpciones",
                columns: new[] { "EncuestaRespuestaValorId", "EncuestaOpcionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestaOpciones_TenantId",
                table: "EncuestaRespuestaOpciones",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestas_EncuestaId_UsuarioId",
                table: "EncuestaRespuestas",
                columns: new[] { "EncuestaId", "UsuarioId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestas_TenantId",
                table: "EncuestaRespuestas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestas_UsuarioId",
                table: "EncuestaRespuestas",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestaValores_EncuestaPreguntaId",
                table: "EncuestaRespuestaValores",
                column: "EncuestaPreguntaId");

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestaValores_EncuestaRespuestaId_EncuestaPregun~",
                table: "EncuestaRespuestaValores",
                columns: new[] { "EncuestaRespuestaId", "EncuestaPreguntaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EncuestaRespuestaValores_TenantId",
                table: "EncuestaRespuestaValores",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Encuestas_TenantId",
                table: "Encuestas",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Encuestas_TenantId_Estado_FechaCierre",
                table: "Encuestas",
                columns: new[] { "TenantId", "Estado", "FechaCierre" });

            migrationBuilder.CreateIndex(
                name: "IX_Encuestas_UsuarioCreadorId",
                table: "Encuestas",
                column: "UsuarioCreadorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EncuestaDestinatarios");

            migrationBuilder.DropTable(
                name: "EncuestaRespuestaOpciones");

            migrationBuilder.DropTable(
                name: "EncuestaOpciones");

            migrationBuilder.DropTable(
                name: "EncuestaRespuestaValores");

            migrationBuilder.DropTable(
                name: "EncuestaPreguntas");

            migrationBuilder.DropTable(
                name: "EncuestaRespuestas");

            migrationBuilder.DropTable(
                name: "Encuestas");
        }
    }
}
