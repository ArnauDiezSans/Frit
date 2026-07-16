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
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Threading.RateLimiting;

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
        options.Events.OnValidatePrincipal = async context =>
        {
            var userIdClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var userId))
            {
                context.RejectPrincipal();
                await context.HttpContext.SignOutAsync();
                return;
            }

            var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
            var user = await db.Usuarios
                .AsNoTracking()
                .Where(row => row.UsuarioId == userId)
                .Select(row => new { row.UsuarioId, row.Nombre, row.EsAdmin })
                .FirstOrDefaultAsync();

            if (user is null)
            {
                context.RejectPrincipal();
                await context.HttpContext.SignOutAsync();
                return;
            }

            var identity = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.UsuarioId.ToString()),
                new Claim(ClaimTypes.Name, user.Nombre),
                new Claim(ClaimTypes.Role, user.EsAdmin ? "Admin" : "User")
            ], CookieAuthenticationDefaults.AuthenticationScheme);

            context.ReplacePrincipal(new ClaimsPrincipal(identity));
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddHttpClient();

builder.Services.AddScoped<PasswordService>();
builder.Services.AddScoped<UsuarioService>();
builder.Services.AddScoped<UsuarioJuegoOrdenService>();
builder.Services.AddScoped<IBggMedalImageService, BggMedalImageService>();
builder.Services.AddScoped<JuegoService>();
builder.Services.AddScoped<PartidaService>();
builder.Services.AddScoped<PartidaJugadorService>();
builder.Services.AddScoped<PendentCompraService>();
builder.Services.AddScoped<CineService>();
builder.Services.AddScoped<CsopaService>();
builder.Services.AddScoped<AQueJuguemService>();
builder.Services.AddScoped<LaLlistaService>();
builder.Services.AddScoped<RankingsService>();
builder.Services.AddScoped<HallOfFameService>();

var connectionString = GetConnectionString(builder.Configuration["DATABASE_URL"]);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var app = builder.Build();

if (args.Contains("--migrate", StringComparer.OrdinalIgnoreCase))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    return;
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseRateLimiter();
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
            SslMode = SslMode.Require
        };

        return builder.ConnectionString;
    }

    return databaseUrl;
}
