using System.Globalization;
using System.Xml.Linq;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class JuegoService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;

    public JuegoService(AppDbContext context, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
    }

    public async Task<List<JuegoDto>> GetAllAsync()
    {
        return await _context.Juegos
            .OrderBy(j => j.Nombre)
            .Select(j => new JuegoDto
            {
                JuegoId = j.JuegoId,
                Nombre = j.Nombre,
                BggId = j.BggId,
                DificultadBgg = j.DificultadBgg,
                NumeroJugadoresMin = j.NumeroJugadoresMin,
                NumeroJugadoresMax = j.NumeroJugadoresMax,
                Pvp = j.Pvp,
                PropietarioId = j.PropietarioId,
                FechaAdquisicion = j.FechaAdquisicion,
                Tipo = j.Tipo,
                JuegoBaseId = j.JuegoBaseId
            })
            .ToListAsync();
    }

    public async Task<JuegoDto?> GetByIdAsync(int id)
    {
        return await _context.Juegos
            .Where(j => j.JuegoId == id)
            .Select(j => new JuegoDto
            {
                JuegoId = j.JuegoId,
                Nombre = j.Nombre,
                BggId = j.BggId,
                DificultadBgg = j.DificultadBgg,
                NumeroJugadoresMin = j.NumeroJugadoresMin,
                NumeroJugadoresMax = j.NumeroJugadoresMax,
                Pvp = j.Pvp,
                PropietarioId = j.PropietarioId,
                FechaAdquisicion = j.FechaAdquisicion,
                Tipo = j.Tipo,
                JuegoBaseId = j.JuegoBaseId
            })
            .FirstOrDefaultAsync();
    }

    public async Task<(bool Success, string? Error, JuegoDto? Juego)> CreateAsync(JuegoDto dto)
    {
        if (dto.NumeroJugadoresMin > dto.NumeroJugadoresMax)
        {
            return (false, "El nombre mínim de jugadors no pot ser més gran que el màxim.", null);
        }

        var propietarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == dto.PropietarioId);
        if (!propietarioExiste)
        {
            return (false, "L'identificador del propietari indicat no existeix.", null);
        }

        if (dto.JuegoBaseId.HasValue)
        {
            var juegoBaseExiste = await _context.Juegos.AnyAsync(j => j.JuegoId == dto.JuegoBaseId.Value);
            if (!juegoBaseExiste)
            {
                return (false, "L'identificador del joc base indicat no existeix.", null);
            }
        }

        var juego = new Juego
        {
            Nombre = dto.Nombre.Trim(),
            BggId = dto.BggId,
            DificultadBgg = dto.DificultadBgg,
            NumeroJugadoresMin = dto.NumeroJugadoresMin,
            NumeroJugadoresMax = dto.NumeroJugadoresMax,
            Pvp = dto.Pvp,
            PropietarioId = dto.PropietarioId,
            FechaAdquisicion = dto.FechaAdquisicion,
            Tipo = dto.Tipo.Trim(),
            JuegoBaseId = dto.JuegoBaseId
        };

        _context.Juegos.Add(juego);
        await _context.SaveChangesAsync();

        dto.JuegoId = juego.JuegoId;
        return (true, null, dto);
    }

    public async Task<(bool Success, string? Error, JuegoDto? Juego)> UpdateAsync(int id, JuegoDto dto)
    {
        if (id != dto.JuegoId)
        {
            return (false, "L'identificador de la ruta no coincideix amb el JuegoId del cos de la petició.", null);
        }

        if (dto.NumeroJugadoresMin > dto.NumeroJugadoresMax)
        {
            return (false, "El nombre mínim de jugadors no pot ser més gran que el màxim.", null);
        }

        var juego = await _context.Juegos.FirstOrDefaultAsync(j => j.JuegoId == id);
        if (juego is null)
        {
            return (false, "Joc no trobat.", null);
        }

        var propietarioExiste = await _context.Usuarios.AnyAsync(u => u.UsuarioId == dto.PropietarioId);
        if (!propietarioExiste)
        {
            return (false, "L'identificador del propietari indicat no existeix.", null);
        }

        if (dto.JuegoBaseId.HasValue)
        {
            if (dto.JuegoBaseId.Value == id)
            {
                return (false, "Un joc no pot ser el seu propi joc base.", null);
            }

            var juegoBaseExiste = await _context.Juegos.AnyAsync(j => j.JuegoId == dto.JuegoBaseId.Value);
            if (!juegoBaseExiste)
            {
                return (false, "L'identificador del joc base indicat no existeix.", null);
            }
        }

        juego.Nombre = dto.Nombre.Trim();
        juego.BggId = dto.BggId;
        juego.DificultadBgg = dto.DificultadBgg;
        juego.NumeroJugadoresMin = dto.NumeroJugadoresMin;
        juego.NumeroJugadoresMax = dto.NumeroJugadoresMax;
        juego.Pvp = dto.Pvp;
        juego.PropietarioId = dto.PropietarioId;
        juego.FechaAdquisicion = dto.FechaAdquisicion;
        juego.Tipo = dto.Tipo.Trim();
        juego.JuegoBaseId = dto.JuegoBaseId;

        await _context.SaveChangesAsync();

        return (true, null, dto);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var juego = await _context.Juegos.FirstOrDefaultAsync(j => j.JuegoId == id);

        if (juego is null)
        {
            return false;
        }

        _context.Juegos.Remove(juego);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<(bool Success, string? Error, BggJuegoLookupDto? Juego)> GetFromBggAsync(int bggId)
    {
        if (bggId <= 0)
        {
            return (false, "El BGG ID ha de ser més gran que 0.", null);
        }

        var url = $"https://boardgamegeek.com/xmlapi2/thing?id={bggId}&stats=1";

        using var response = await _httpClient.GetAsync(url);

        if (!response.IsSuccessStatusCode)
        {
            return (false, "No s'ha pogut consultar BoardGameGeek.", null);
        }

        await using var stream = await response.Content.ReadAsStreamAsync();
        var document = XDocument.Load(stream);

        var item = document.Root?.Elements("item").FirstOrDefault();
        if (item is null)
        {
            return (false, "No s'ha trobat cap joc amb aquest BGG ID.", null);
        }

        var primaryName = item.Elements("name")
            .FirstOrDefault(x => string.Equals((string?)x.Attribute("type"), "primary", StringComparison.OrdinalIgnoreCase))
            ?.Attribute("value")?.Value
            ?? item.Elements("name").FirstOrDefault()?.Attribute("value")?.Value
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(primaryName))
        {
            return (false, "BGG no ha retornat un nom vàlid per a aquest joc.", null);
        }

        var minPlayers = ParseIntAttribute(item.Element("minplayers"), "value");
        var maxPlayers = ParseIntAttribute(item.Element("maxplayers"), "value");
        var yearPublished = ParseIntAttribute(item.Element("yearpublished"), "value");
        var playingTime = ParseIntAttribute(item.Element("playingtime"), "value");

        var averageWeight = ParseDecimalAttribute(
            item.Element("statistics")?
                .Element("ratings")?
                .Element("averageweight"),
            "value");

        var categories = item.Elements("link")
            .Where(x => string.Equals((string?)x.Attribute("type"), "boardgamecategory", StringComparison.OrdinalIgnoreCase))
            .Select(x => x.Attribute("value")?.Value)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToList();

        var tipo = categories.FirstOrDefault() ?? string.Empty;

        if (!minPlayers.HasValue || !maxPlayers.HasValue)
        {
            return (false, "BGG no ha retornat el rang de jugadors d'aquest joc.", null);
        }

        var dto = new BggJuegoLookupDto
        {
            BggId = bggId,
            Nombre = primaryName.Trim(),
            NumeroJugadoresMin = minPlayers.Value,
            NumeroJugadoresMax = maxPlayers.Value,
            DificultadBgg = averageWeight,
            Tipo = tipo,
            YearPublished = yearPublished,
            PlayingTime = playingTime
        };

        return (true, null, dto);
    }

    private static int? ParseIntAttribute(XElement? element, string attributeName)
    {
        var value = element?.Attribute(attributeName)?.Value;
        return int.TryParse(value, out var number) ? number : null;
    }

    private static decimal? ParseDecimalAttribute(XElement? element, string attributeName)
    {
        var value = element?.Attribute(attributeName)?.Value;
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out var number)
            ? decimal.Round(number, 2)
            : null;
    }
}