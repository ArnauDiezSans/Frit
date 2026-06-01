using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:8080");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var connectionString = builder.Configuration["DATABASE_URL"];

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException("DATABASE_URL no está configurada.");
}

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

app.UseAuthorization();
app.MapControllers();

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
    private readonly AppDbContext _db;

    public ProductosController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Producto>>> Get()
    {
        return await _db.Productos.ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<Producto>> Post([FromBody] Producto producto)
    {
        _db.Productos.Add(producto);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = producto.Id }, producto);
    }
}