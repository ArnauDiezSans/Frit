using FritApi.Data;
using FritApi.Dtos;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class LaLlistaService
{
    private readonly AppDbContext _context;

    public LaLlistaService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<LaLlistaItemDto>> GetAllAsync(DateOnly today)
    {
        var startOfWeek = today.AddDays(-GetMondayBasedDayOffset(today.DayOfWeek));
        var endOfWeek = startOfWeek.AddDays(6);
        var yellowEnd = endOfWeek.AddDays(14);

        var rows = await _context.Juegos
            .Select(juego => new
            {
                juego.JuegoId,
                juego.Nombre,
                UltimaPartida = juego.Partidas
                    .OrderByDescending(partida => partida.Fecha)
                    .Select(partida => (DateOnly?)partida.Fecha)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return rows
            .Select(row =>
            {
                var caducidad = row.UltimaPartida?.AddYears(1);

                return new LaLlistaItemDto
                {
                    JuegoId = row.JuegoId,
                    Nombre = row.Nombre,
                    UltimaPartida = row.UltimaPartida,
                    EstadoCaducidad = GetEstadoCaducidad(caducidad, startOfWeek, endOfWeek, yellowEnd)
                };
            })
            .OrderBy(row => row.UltimaPartida.HasValue ? 1 : 0)
            .ThenBy(row => row.UltimaPartida)
            .ThenBy(row => row.Nombre)
            .ToList();
    }

    private static string GetEstadoCaducidad(
        DateOnly? caducidad,
        DateOnly startOfWeek,
        DateOnly endOfWeek,
        DateOnly yellowEnd)
    {
        if (!caducidad.HasValue)
        {
            return "expired";
        }

        if (caducidad.Value <= endOfWeek)
        {
            return "red";
        }

        if (caducidad.Value <= yellowEnd)
        {
            return "yellow";
        }

        return string.Empty;
    }

    private static int GetMondayBasedDayOffset(DayOfWeek dayOfWeek)
    {
        return dayOfWeek == DayOfWeek.Sunday ? 6 : (int)dayOfWeek - 1;
    }
}
