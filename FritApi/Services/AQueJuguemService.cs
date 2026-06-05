using FritApi.Data;
using FritApi.Dtos;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class AQueJuguemService
{
    private readonly AppDbContext _context;
    private readonly UsuarioJuegoOrdenService _usuarioJuegoOrdenService;

    public AQueJuguemService(
        AppDbContext context,
        UsuarioJuegoOrdenService usuarioJuegoOrdenService)
    {
        _context = context;
        _usuarioJuegoOrdenService = usuarioJuegoOrdenService;
    }

    public async Task<(bool Success, string? Error, List<AQueJuguemRecommendationDto> Juegos)> GetRecommendationsAsync(
        AQueJuguemRequestDto dto)
    {
        var usuarioIds = dto.UsuarioIds.Distinct().ToList();

        if (usuarioIds.Count != dto.UsuarioIds.Count || usuarioIds.Count != dto.NumeroJugadores)
        {
            return (false, "Has d'indicar un usuari diferent per a cada jugador.", []);
        }

        var existingUsersCount = await _context.Usuarios
            .CountAsync(usuario =>
                usuarioIds.Contains(usuario.UsuarioId) &&
                usuario.UsuarioId != ExternalUserPolicy.ExternalUserId &&
                usuario.Nombre != ExternalUserPolicy.ExternalUserName);

        if (existingUsersCount != usuarioIds.Count)
        {
            return (false, "Algun dels usuaris indicats no existeix o no pot jugar.", []);
        }

        foreach (var usuarioId in usuarioIds)
        {
            await _usuarioJuegoOrdenService.EnsureOrdenCompletoAsync(usuarioId);
        }

        var totalJuegos = await _context.Juegos.CountAsync();

        var juegos = await _context.Juegos
            .Where(juego =>
                juego.NumeroJugadoresMin <= dto.NumeroJugadores &&
                juego.NumeroJugadoresMax >= dto.NumeroJugadores)
            .Select(juego => new
            {
                juego.JuegoId,
                juego.Nombre,
                juego.NumeroJugadoresMin,
                juego.NumeroJugadoresMax
            })
            .ToListAsync();

        var juegoIds = juegos.Select(juego => juego.JuegoId).ToList();

        var puntuaciones = await _context.UsuarioJuegoOrdenes
            .Where(orden => usuarioIds.Contains(orden.UsuarioId) && juegoIds.Contains(orden.JuegoId))
            .GroupBy(orden => orden.JuegoId)
            .Select(group => new
            {
                JuegoId = group.Key,
                Puntuacion = group.Sum(orden => totalJuegos - orden.Posicion)
            })
            .ToDictionaryAsync(item => item.JuegoId, item => item.Puntuacion);

        var result = juegos
            .Select(juego => new AQueJuguemRecommendationDto
            {
                JuegoId = juego.JuegoId,
                Nombre = juego.Nombre,
                NumeroJugadoresMin = juego.NumeroJugadoresMin,
                NumeroJugadoresMax = juego.NumeroJugadoresMax,
                Puntuacion = puntuaciones.GetValueOrDefault(juego.JuegoId)
            })
            .OrderByDescending(juego => juego.Puntuacion)
            .ThenBy(juego => juego.Nombre)
            .ToList();

        return (true, null, result);
    }
}
