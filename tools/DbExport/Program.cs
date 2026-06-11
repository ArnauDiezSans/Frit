using System.Text.Encodings.Web;
using System.Text.Json;
using Npgsql;

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (string.IsNullOrWhiteSpace(databaseUrl))
{
    Console.Error.WriteLine("DATABASE_URL is not set.");
    return 1;
}

var outputPath = args.Length > 0
    ? Path.GetFullPath(args[0])
    : Path.GetFullPath("frit-db-export.json");

var connectionString = BuildConnectionString(databaseUrl);
await using var connection = new NpgsqlConnection(connectionString);
await connection.OpenAsync();

var tables = await GetTablesAsync(connection);
var export = new Dictionary<string, object?>
{
    ["exportedAtUtc"] = DateTime.UtcNow,
    ["database"] = connection.Database,
    ["tables"] = new List<object?>()
};

var exportedTables = (List<object?>)export["tables"]!;

foreach (var table in tables)
{
    var columns = await GetColumnsAsync(connection, table);
    var primaryKeys = await GetPrimaryKeysAsync(connection, table);
    var rows = await GetRowsAsync(connection, table, primaryKeys);

    exportedTables.Add(new Dictionary<string, object?>
    {
        ["name"] = table,
        ["columns"] = columns,
        ["primaryKeys"] = primaryKeys,
        ["rowCount"] = rows.Count,
        ["rows"] = rows
    });
}

var options = new JsonSerializerOptions
{
    WriteIndented = true,
    Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
};

await File.WriteAllTextAsync(outputPath, JsonSerializer.Serialize(export, options));
Console.WriteLine(outputPath);
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

static async Task<List<string>> GetTablesAsync(NpgsqlConnection connection)
{
    const string sql = """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
        """;

    var tables = new List<string>();
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        tables.Add(reader.GetString(0));
    }

    return tables;
}

static async Task<List<Dictionary<string, object?>>> GetColumnsAsync(NpgsqlConnection connection, string table)
{
    const string sql = """
        SELECT column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = @table
        ORDER BY ordinal_position;
        """;

    var columns = new List<Dictionary<string, object?>>();
    await using var command = new NpgsqlCommand(sql, connection);
    command.Parameters.AddWithValue("table", table);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        columns.Add(new Dictionary<string, object?>
        {
            ["name"] = reader.GetString(0),
            ["type"] = reader.GetString(1),
            ["nullable"] = reader.GetString(2) == "YES",
            ["ordinal"] = reader.GetInt32(3)
        });
    }

    return columns;
}

static async Task<List<string>> GetPrimaryKeysAsync(NpgsqlConnection connection, string table)
{
    const string sql = """
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a
          ON a.attrelid = i.indrelid
         AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = format('public.%I', @table)::regclass
          AND i.indisprimary
        ORDER BY array_position(i.indkey, a.attnum);
        """;

    var keys = new List<string>();
    await using var command = new NpgsqlCommand(sql, connection);
    command.Parameters.AddWithValue("table", table);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        keys.Add(reader.GetString(0));
    }

    return keys;
}

static async Task<List<Dictionary<string, object?>>> GetRowsAsync(
    NpgsqlConnection connection,
    string table,
    List<string> primaryKeys)
{
    var quotedTable = QuoteIdentifier(table);
    var orderBy = primaryKeys.Count > 0
        ? " ORDER BY " + string.Join(", ", primaryKeys.Select(QuoteIdentifier))
        : string.Empty;
    var sql = $"SELECT * FROM public.{quotedTable}{orderBy};";

    var rows = new List<Dictionary<string, object?>>();
    await using var command = new NpgsqlCommand(sql, connection);
    await using var reader = await command.ExecuteReaderAsync();

    while (await reader.ReadAsync())
    {
        var row = new Dictionary<string, object?>();

        for (var index = 0; index < reader.FieldCount; index += 1)
        {
            row[reader.GetName(index)] = await reader.IsDBNullAsync(index)
                ? null
                : ConvertValue(reader.GetValue(index));
        }

        rows.Add(row);
    }

    return rows;
}

static object ConvertValue(object value)
{
    return value switch
    {
        DateTime dateTime => dateTime.ToString("O"),
        DateOnly dateOnly => dateOnly.ToString("yyyy-MM-dd"),
        TimeOnly timeOnly => timeOnly.ToString("HH:mm:ss.fffffff"),
        byte[] bytes => Convert.ToBase64String(bytes),
        _ => value
    };
}

static string QuoteIdentifier(string value)
{
    return "\"" + value.Replace("\"", "\"\"") + "\"";
}
