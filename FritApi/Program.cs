// npx.cmd repomix 

//reset DB (al sql console del postgres):
// TRUNCATE TABLE public."PendentsCompra", public."UsuarioJuegoOrdenes", public."Partidas", public."Juegos", public."Usuarios", public."PartidaJugadores" RESTART IDENTITY CASCADE;

// cd FritWeb
// npm install
// npm start

// cd C:\\Repos\\Frit\\FritApi
// $env:DATABASE_URL="Host=zephyr.proxy.rlwy.net;Port=35416;Database=railway;Username=postgres;Password=TU_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
// dotnet run

//Agafar la pass del posgress
// $env:DATABASE_URL="Host=zephyr.proxy.rlwy.net;Port=35416;Database=railway;Username=postgres;Password=LA_TEVA_PASSWORD;SSL Mode=Require;Trust Server Certificate=true"
// dotnet run --project tools\ResetPasswords -- --user Xumi 1234

using FritApi.Data;
using FritApi.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "frit_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
    });

builder.Services.AddAuthorization();

builder.Services.AddHttpClient();

builder.Services.AddScoped<PasswordService>();
builder.Services.AddScoped<UsuarioService>();
builder.Services.AddScoped<UsuarioJuegoOrdenService>();
builder.Services.AddScoped<JuegoService>();
builder.Services.AddScoped<PartidaService>();
builder.Services.AddScoped<PartidaJugadorService>();
builder.Services.AddScoped<PendentCompraService>();
builder.Services.AddScoped<AQueJuguemService>();
builder.Services.AddScoped<LaLlistaService>();
builder.Services.AddScoped<RankingsService>();
builder.Services.AddScoped<VersionControlService>();

var connectionString = GetConnectionString(builder.Configuration["DATABASE_URL"]);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapControllers();
app.MapHealthChecks("/health");
app.MapFallbackToFile("index.html");

app.Run();

static string GetConnectionString(string? databaseUrl)
{
    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        throw new InvalidOperationException("La variable DATABASE_URL no està configurada.");
    }

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
