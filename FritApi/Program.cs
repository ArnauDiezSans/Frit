using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Railway: escuchar en el host y puerto correctos
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// Servicios
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Base de datos desactivada por ahora
// Descomenta esto cuando tengas PostgreSQL configurado en Railway
// var connectionString = builder.Configuration.GetConnectionString("Default")
//     ?? builder.Configuration["DATABASE_URL"];
//
// builder.Services.AddDbContext<AppDbContext>(options =>
//     options.UseNpgsql(connectionString));

var app = builder.Build();

// Swagger habilitado para comprobar que responde en Railway
app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthorization();
app.MapControllers();

// Endpoint simple para probar que la app responde
app.MapGet("/", () => Results.Ok(new
{
    ok = true,
    service = "FritApi",
    status = "online"
}));

app.Run();

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Producto> Productos { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
    }
}

public class Producto
{
    public int Id { get; set; }
    public string Nombre { get; set; } = "";
    public decimal Precio { get; set; }
    public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;
}

[ApiController]
[Route("api/[controller]")]
public class ProductosController : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<Producto>> Get()
    {
        var productos = new List<Producto>
        {
            new Producto
            {
                Id = 1,
                Nombre = "Producto de prueba",
                Precio = 9.99m,
                FechaCreacion = DateTime.UtcNow
            }
        };

        return Ok(productos);
    }

    [HttpPost]
    public ActionResult<Producto> Post([FromBody] Producto producto)
    {
        producto.Id = 1;
        producto.FechaCreacion = DateTime.UtcNow;
        return Ok(producto);
    }
}