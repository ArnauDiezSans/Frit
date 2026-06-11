using Npgsql;

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrWhiteSpace(databaseUrl))
{
    Console.Error.WriteLine("DATABASE_URL is not set.");
    return 1;
}

if (args.Length == 0)
{
    Console.Error.WriteLine("Usage: DbSql <sql-file>");
    return 1;
}

var sqlPath = Path.GetFullPath(args[0]);
var sql = await File.ReadAllTextAsync(sqlPath);

await using var connection = new NpgsqlConnection(BuildConnectionString(databaseUrl));
await connection.OpenAsync();

await using var command = new NpgsqlCommand(sql, connection);
command.CommandTimeout = 300;

await using var reader = await command.ExecuteReaderAsync();
var resultSet = 1;

do
{
    if (reader.FieldCount <= 0)
    {
        continue;
    }

    Console.WriteLine($"-- result set {resultSet}");
    Console.WriteLine(string.Join("\t", Enumerable.Range(0, reader.FieldCount).Select(reader.GetName)));

    while (await reader.ReadAsync())
    {
        var values = new List<string>();
        for (var i = 0; i < reader.FieldCount; i += 1)
        {
            values.Add(await reader.IsDBNullAsync(i) ? "" : Convert.ToString(reader.GetValue(i)) ?? "");
        }

        Console.WriteLine(string.Join("\t", values));
    }

    resultSet += 1;
}
while (await reader.NextResultAsync());

return 0;

static string BuildConnectionString(string databaseUrl)
{
    if (databaseUrl.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        databaseUrl.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
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

    return databaseUrl;
}
