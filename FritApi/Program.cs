using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:8080");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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
    [HttpGet]
    public ActionResult<IEnumerable<Producto>> Get()
    {
        return Ok(new List<Producto>
        {
            new Producto
            {
                Id = 1,
                Nombre = "Producto de prueba",
                Precio = 9.99m,
                FechaCreacion = DateTime.UtcNow
            }
        });
    }

    [HttpPost]
    public ActionResult<Producto> Post([FromBody] Producto producto)
    {
        producto.Id = 1;
        producto.FechaCreacion = DateTime.UtcNow;
        return Ok(producto);
    }
}