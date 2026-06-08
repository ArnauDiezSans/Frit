using Microsoft.AspNetCore.Identity;
using Npgsql;

if (args.Length < 2 || args[0] is not ("--all" or "--group" or "--user"))
{
    PrintUsage();
    return 1;
}

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

if (string.IsNullOrWhiteSpace(databaseUrl))
{
    Console.Error.WriteLine("DATABASE_URL no esta configurada.");
    return 1;
}

var mode = args[0];
var target = mode == "--all" ? null : args[1];
var password = mode == "--all" ? args[1] : args.ElementAtOrDefault(2);

if (string.IsNullOrWhiteSpace(password))
{
    PrintUsage();
    return 1;
}

var hash = new PasswordHasher<object>().HashPassword(new object(), password);
await using var connection = new NpgsqlConnection(GetConnectionString(databaseUrl));
await connection.OpenAsync();

await using var command = connection.CreateCommand();
command.CommandText = mode switch
{
    "--all" => """UPDATE public."Usuarios" SET "PasswordHash" = @hash""",
    "--group" => """UPDATE public."Usuarios" SET "PasswordHash" = @hash WHERE "Grupo" = @target""",
    "--user" => """UPDATE public."Usuarios" SET "PasswordHash" = @hash WHERE "Nombre" = @target""",
    _ => throw new InvalidOperationException("Mode no suportat.")
};

command.Parameters.AddWithValue("hash", hash);

if (target is not null)
{
    command.Parameters.AddWithValue("target", target);
}

var updated = await command.ExecuteNonQueryAsync();
Console.WriteLine($"Passwords regenerades: {updated}");
return 0;

static void PrintUsage()
{
    Console.WriteLine("Us:");
    Console.WriteLine("  dotnet run --project tools/ResetPasswords -- --all <passwordTemporal>");
    Console.WriteLine("  dotnet run --project tools/ResetPasswords -- --group <grup> <passwordTemporal>");
    Console.WriteLine("  dotnet run --project tools/ResetPasswords -- --user <nomUsuari> <passwordTemporal>");
}

static string GetConnectionString(string databaseUrl)
{
    if (!databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        return databaseUrl;
    }

    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':', 2);

    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.Trim('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        SslMode = SslMode.Require,
        TrustServerCertificate = true
    };

    return builder.ConnectionString;
}
