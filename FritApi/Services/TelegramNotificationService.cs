using System.Net;
using System.Net.Http.Json;
using FritApi.Data;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public sealed class TelegramNotificationService(
    AppDbContext context,
    IConfiguration configuration,
    ILogger<TelegramNotificationService> logger)
{
    private static readonly HttpClient HttpClient = new() { Timeout = TimeSpan.FromSeconds(10) };

    private string? BotToken => FirstConfigured("TELEGRAM_BOT_TOKEN", "Telegram:BotToken");
    private string? ChatId => FirstConfigured("TELEGRAM_CHAT_ID", "Telegram:ChatId");
    private string? TenantCode => FirstConfigured("TELEGRAM_TENANT_CODE", "Telegram:TenantCode");

    public async Task SendPublishedSurveyAsync(bool isPoll, string title, string relativeUrl, CancellationToken cancellationToken = default)
    {
        var botToken = BotToken;
        var chatId = ChatId;
        var tenantCode = TenantCode;
        if (string.IsNullOrWhiteSpace(botToken) || string.IsNullOrWhiteSpace(chatId) || string.IsNullOrWhiteSpace(tenantCode)) return;

        var isTargetTenant = await context.Tenants.AsNoTracking()
            .AnyAsync(tenant => tenant.TenantId == context.CurrentTenantId && tenant.Codi == tenantCode, cancellationToken);
        if (!isTargetTenant) return;

        try
        {
            var publicUrl = BuildPublicUrl(relativeUrl);
            var kind = isPoll ? "votació" : "enquesta";
            var payload = new
            {
                chat_id = chatId,
                text = $"📊 <b>Nova {kind}</b>\n{WebUtility.HtmlEncode(title)}",
                parse_mode = "HTML",
                disable_web_page_preview = true,
                reply_markup = new
                {
                    inline_keyboard = new[]
                    {
                        new[] { new { text = isPoll ? "Votar a Frit" : "Respondre a Frit", url = publicUrl } }
                    }
                }
            };

            using var response = await HttpClient.PostAsJsonAsync(
                $"https://api.telegram.org/bot{botToken}/sendMessage",
                payload,
                cancellationToken);
            if (!response.IsSuccessStatusCode)
                logger.LogWarning("Telegram ha retornat HTTP {StatusCode} enviant una notificació del tenant {TenantId}.",
                    (int)response.StatusCode, context.CurrentTenantId);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No s'ha pogut enviar la notificació de Telegram del tenant {TenantId}.", context.CurrentTenantId);
        }
    }

    private string BuildPublicUrl(string relativeUrl)
    {
        var configuredUrl = FirstConfigured("PUBLIC_APP_URL", "Telegram:PublicAppUrl");
        if (!string.IsNullOrWhiteSpace(configuredUrl)) return $"{configuredUrl.TrimEnd('/')}/{relativeUrl.TrimStart('/')}";
        var railwayDomain = configuration["RAILWAY_PUBLIC_DOMAIN"];
        return !string.IsNullOrWhiteSpace(railwayDomain)
            ? $"https://{railwayDomain.TrimEnd('/')}/{relativeUrl.TrimStart('/')}"
            : relativeUrl;
    }

    private string? FirstConfigured(params string[] keys) =>
        keys.Select(key => configuration[key]).FirstOrDefault(value => !string.IsNullOrWhiteSpace(value));
}
