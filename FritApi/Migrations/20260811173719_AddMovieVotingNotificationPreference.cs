using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FritApi.Migrations
{
    /// <inheritdoc />
    public partial class AddMovieVotingNotificationPreference : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "VotacionPelicula",
                table: "NotificationPreferences",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VotacionPelicula",
                table: "NotificationPreferences");
        }
    }
}
