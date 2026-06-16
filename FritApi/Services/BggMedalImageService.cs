using System.Net;
using System.Net.Http.Headers;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Processing;

namespace FritApi.Services;

public class BggMedalImageService : IBggMedalImageService
{
    private const int MedalSize = 160;
    private const int MedalPadding = 8;
    private readonly HttpClient _httpClient;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<BggMedalImageService> _logger;
    private readonly string? _bggApplicationToken;

    public BggMedalImageService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<BggMedalImageService> logger)
    {
        _httpClient = httpClientFactory.CreateClient();
        _environment = environment;
        _logger = logger;
        _bggApplicationToken = FirstConfiguredValue(
            configuration["Bgg:ApplicationToken"],
            configuration["BGG_APPLICATION_TOKEN"],
            Environment.GetEnvironmentVariable("BGG_APPLICATION_TOKEN"),
            Environment.GetEnvironmentVariable("Bgg__ApplicationToken"));
    }

    public async Task EnsureGameMedalImageAsync(int juegoId, int bggId)
    {
        if (juegoId <= 0 || bggId <= 0)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(_bggApplicationToken))
        {
            _logger.LogWarning("No s'ha descarregat la medalla del joc {JuegoId}: token BGG no configurat.", juegoId);
            return;
        }

        try
        {
            var imageUrl = await GetBggImageUrlAsync(bggId);
            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                _logger.LogWarning("BGG no ha retornat imatge per al joc {JuegoId} amb BGG ID {BggId}.", juegoId, bggId);
                return;
            }

            await using var imageStream = await _httpClient.GetStreamAsync(imageUrl);
            using var image = await Image.LoadAsync<Rgba32>(imageStream);
            using var medal = BuildMedalImage(image);

            foreach (var outputPath in GetOutputPaths(juegoId))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
                await medal.SaveAsPngAsync(outputPath, new PngEncoder
                {
                    CompressionLevel = PngCompressionLevel.BestCompression
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No s'ha pogut generar la medalla del joc {JuegoId} amb BGG ID {BggId}.", juegoId, bggId);
        }
    }

    private async Task<string?> GetBggImageUrlAsync(int bggId)
    {
        var url = $"https://boardgamegeek.com/xmlapi2/thing?id={bggId}";

        for (var attempt = 1; attempt <= 5; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _bggApplicationToken!.Trim());

            using var response = await _httpClient.SendAsync(request);

            if (response.StatusCode == HttpStatusCode.Accepted)
            {
                await Task.Delay(TimeSpan.FromSeconds(attempt));
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("BGG ha retornat HTTP {StatusCode} consultant la imatge del BGG ID {BggId}.", (int)response.StatusCode, bggId);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync();
            var document = XDocument.Load(stream);
            var item = document.Root?.Elements("item").FirstOrDefault();

            return item?.Element("image")?.Value.Trim()
                ?? item?.Element("thumbnail")?.Value.Trim();
        }

        _logger.LogWarning("BGG segueix processant la consulta d'imatge del BGG ID {BggId}.", bggId);
        return null;
    }

    private static Image<Rgba32> BuildMedalImage(Image<Rgba32> source)
    {
        source.Mutate(context => context.AutoOrient());

        var maxSide = MedalSize - (MedalPadding * 2);
        var ratio = Math.Min((double)maxSide / source.Width, (double)maxSide / source.Height);
        var width = Math.Max(1, (int)Math.Round(source.Width * ratio));
        var height = Math.Max(1, (int)Math.Round(source.Height * ratio));

        source.Mutate(context => context.Resize(width, height));

        var medal = new Image<Rgba32>(MedalSize, MedalSize, Color.Transparent);
        var location = new Point((MedalSize - width) / 2, (MedalSize - height) / 2);
        medal.Mutate(context => context.DrawImage(source, location, 1f));

        return medal;
    }

    private IEnumerable<string> GetOutputPaths(int juegoId)
    {
        var webRootPath = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;

        yield return Path.Combine(webRootPath, "assets", "medallas", "jocs", $"{juegoId}.png");

        var frontendAssetsPath = Path.GetFullPath(Path.Combine(
            _environment.ContentRootPath,
            "..",
            "FritWeb",
            "src",
            "assets"));

        if (Directory.Exists(frontendAssetsPath))
        {
            yield return Path.Combine(frontendAssetsPath, "medallas", "jocs", $"{juegoId}.png");
        }
    }

    private static string? FirstConfiguredValue(params string?[] values)
    {
        return values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
    }
}
