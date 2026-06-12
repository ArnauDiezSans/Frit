using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Xml.Linq;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class JuegoService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly string? _bggApplicationToken;
    private static readonly IReadOnlyDictionary<string, string> BggCategoryTranslations =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Abstract Strategy"] = "Estratègia abstracta",
            ["Action / Dexterity"] = "Acció / Destresa",
            ["Adventure"] = "Aventura",
            ["Age of Reason"] = "Era de la Raó",
            ["American Civil War"] = "Guerra Civil Americana",
            ["American Indian Wars"] = "Guerres índies americanes",
            ["American Revolutionary War"] = "Guerra d'Independència Americana",
            ["American West"] = "Oest americà",
            ["Ancient"] = "Antiguitat",
            ["Animals"] = "Animals",
            ["Arabian"] = "Àrab",
            ["Aviation / Flight"] = "Aviació / Vol",
            ["Bluffing"] = "Engany",
            ["Book"] = "Llibre",
            ["Card Game"] = "Joc de cartes",
            ["Children's Game"] = "Joc infantil",
            ["City Building"] = "Construcció de ciutats",
            ["Civil War"] = "Guerra civil",
            ["Civilization"] = "Civilització",
            ["Collectible Components"] = "Components col·leccionables",
            ["Comic Book / Strip"] = "Còmic",
            ["Deduction"] = "Deducció",
            ["Dice"] = "Daus",
            ["Economic"] = "Econòmic",
            ["Educational"] = "Educatiu",
            ["Electronic"] = "Electrònic",
            ["Environmental"] = "Medi ambient",
            ["Expansion for Base-game"] = "Expansió d'un joc base",
            ["Exploration"] = "Exploració",
            ["Fan Expansion"] = "Expansió fan",
            ["Fantasy"] = "Fantasia",
            ["Farming"] = "Agricultura",
            ["Fighting"] = "Combat",
            ["Game System"] = "Sistema de joc",
            ["Horror"] = "Terror",
            ["Humor"] = "Humor",
            ["Industry / Manufacturing"] = "Indústria / Fabricació",
            ["Korean War"] = "Guerra de Corea",
            ["Mafia"] = "Màfia",
            ["Math"] = "Matemàtiques",
            ["Mature / Adult"] = "Adults",
            ["Maze"] = "Laberint",
            ["Medical"] = "Medicina",
            ["Medieval"] = "Medieval",
            ["Memory"] = "Memòria",
            ["Miniatures"] = "Miniatures",
            ["Modern Warfare"] = "Guerra moderna",
            ["Movies / TV / Radio theme"] = "Tema de cinema / TV / ràdio",
            ["Murder / Mystery"] = "Assassinat / Misteri",
            ["Music"] = "Música",
            ["Mythology"] = "Mitologia",
            ["Napoleonic"] = "Napoleònic",
            ["Nautical"] = "Nàutic",
            ["Negotiation"] = "Negociació",
            ["Novel-based"] = "Basat en novel·la",
            ["Number"] = "Números",
            ["Party Game"] = "Joc de festa",
            ["Pike and Shot"] = "Pica i mosquet",
            ["Pirates"] = "Pirates",
            ["Political"] = "Polític",
            ["Post-Napoleonic"] = "Postnapoleònic",
            ["Prehistoric"] = "Prehistòria",
            ["Print & Play"] = "Imprimeix i juga",
            ["Puzzle"] = "Trencaclosques",
            ["Racing"] = "Curses",
            ["Real-time"] = "Temps real",
            ["Religious"] = "Religiós",
            ["Renaissance"] = "Renaixement",
            ["Science Fiction"] = "Ciència-ficció",
            ["Space Exploration"] = "Exploració espacial",
            ["Spies / Secret Agents"] = "Espies / Agents secrets",
            ["Sports"] = "Esports",
            ["Territory Building"] = "Construcció de territori",
            ["Third-party Expansion"] = "Expansió de tercers",
            ["Trains"] = "Trens",
            ["Transportation"] = "Transport",
            ["Travel"] = "Viatges",
            ["Trivia"] = "Preguntes i respostes",
            ["Video Game Theme"] = "Tema de videojoc",
            ["Vietnam War"] = "Guerra del Vietnam",
            ["Wargame"] = "Joc de guerra",
            ["Word Game"] = "Joc de paraules",
            ["World War I"] = "Primera Guerra Mundial",
            ["World War II"] = "Segona Guerra Mundial",
            ["Zombies"] = "Zombis"
        };

    public JuegoService(AppDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _context = context;
        _httpClient = httpClientFactory.CreateClient();
        _bggApplicationToken = FirstConfiguredValue(
            configuration["Bgg:ApplicationToken"],
            configuration["BGG_APPLICATION_TOKEN"],
            Environment.GetEnvironmentVariable("BGG_APPLICATION_TOKEN"),
            Environment.GetEnvironmentVariable("Bgg__ApplicationToken"));
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
        if (string.IsNullOrWhiteSpace(_bggApplicationToken))
        {
            return (false, "El token de BoardGameGeek no estÃ  configurat.", null);
        }

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _bggApplicationToken.Trim());

            using var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == HttpStatusCode.Accepted)
            {
                await Task.Delay(TimeSpan.FromSeconds(attempt));
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                return (false, $"No s'ha pogut consultar BoardGameGeek. Codi {(int)response.StatusCode}.", null);
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
                .Select(x => TranslateBggCategory(x!))
                .ToList();

            var tipo = string.Join(", ", categories);

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

        return (false, "BoardGameGeek està processant la consulta. Torna-ho a provar d'aquí uns segons.", null);
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

    private static string? FirstConfiguredValue(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }

    private static string TranslateBggCategory(string category)
    {
        return BggCategoryTranslations.TryGetValue(category, out var translated)
            ? translated
            : category;
    }
}
