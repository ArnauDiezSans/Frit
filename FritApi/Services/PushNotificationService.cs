using System.Net;
using System.Text.Json;
using FritApi.Data;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace FritApi.Services;

public sealed class PushNotificationService(
    AppDbContext context,
    IConfiguration configuration,
    ILogger<PushNotificationService> logger)
{
    private const string Subject = "mailto:naudelsud@hotmail.com";

    public string? PublicKey => configuration["VAPID_PUBLIC_KEY"];
    private string? PrivateKey => configuration["VAPID_PRIVATE_KEY"];
    public bool IsConfigured => !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);

    public async Task UpsertAsync(int usuarioId, string endpoint, string p256dh, string auth)
    {
        var subscription = await context.PushSubscriptions
            .FirstOrDefaultAsync(row => row.Endpoint == endpoint);

        if (subscription is null)
        {
            context.PushSubscriptions.Add(new Models.PushSubscription
            {
                UsuarioId = usuarioId,
                Endpoint = endpoint,
                P256dh = p256dh,
                Auth = auth
            });
        }
        else
        {
            subscription.UsuarioId = usuarioId;
            subscription.P256dh = p256dh;
            subscription.Auth = auth;
            subscription.UpdatedAt = DateTime.UtcNow;
        }

        await context.SaveChangesAsync();
    }

    public async Task RemoveAsync(int usuarioId, string endpoint)
    {
        var subscription = await context.PushSubscriptions
            .FirstOrDefaultAsync(row => row.UsuarioId == usuarioId && row.Endpoint == endpoint);

        if (subscription is null)
        {
            return;
        }

        context.PushSubscriptions.Remove(subscription);
        await context.SaveChangesAsync();
    }

    public async Task<bool> SendTestAsync(int usuarioId, string endpoint, CancellationToken cancellationToken)
    {
        var subscription = await context.PushSubscriptions
            .AsNoTracking()
            .FirstOrDefaultAsync(row => row.UsuarioId == usuarioId && row.Endpoint == endpoint, cancellationToken);

        if (subscription is null)
        {
            return false;
        }

        await SendAsync(
            [subscription],
            "Notificacions activades",
            "Ja pots rebre avisos de Frit en aquest dispositiu.",
            "/app/usuario",
            cancellationToken);
        return true;
    }

    public async Task SendNewGameAsync(string gameName, int partidaId, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            logger.LogWarning("No s'ha enviat la notificació perquè les claus VAPID no estan configurades.");
            return;
        }

        try
        {
            var subscriptions = await context.PushSubscriptions
                .AsNoTracking()
                .ToListAsync(cancellationToken);

            await SendAsync(
                subscriptions,
                "Nova partida registrada",
                $"S'ha registrat una partida de {gameName}.",
                $"/app/partidas?partidaId={partidaId}",
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No s'han pogut preparar les notificacions de la partida {PartidaId}.", partidaId);
        }
    }

    public async Task SendSundayGreetingAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            logger.LogWarning("No s'ha enviat la notificació de diumenge perquè les claus VAPID no estan configurades.");
            return;
        }

        var subscriptions = await context.PushSubscriptions
            .IgnoreQueryFilters()
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        await SendAsync(
            subscriptions,
            "Frit",
            "Bon diumenge",
            "/",
            cancellationToken);
    }

    private async Task SendAsync(
        IReadOnlyCollection<Models.PushSubscription> subscriptions,
        string title,
        string body,
        string url,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured || subscriptions.Count == 0)
        {
            if (!IsConfigured)
            {
                logger.LogWarning("No s'ha enviat la notificació perquè les claus VAPID no estan configurades.");
            }
            return;
        }

        var payload = JsonSerializer.Serialize(new
        {
            notification = new
            {
                title,
                body,
                icon = "/notification-icon-192x192.png",
                badge = "/notification-badge-96x96.png",
                data = new
                {
                    onActionClick = new
                    {
                        @default = new { operation = "openWindow", url }
                    }
                }
            }
        });
        var vapid = new VapidDetails(Subject, PublicKey!, PrivateKey!);
        var expiredIds = new List<int>();

        using var client = new WebPushClient();
        foreach (var row in subscriptions)
        {
            try
            {
                var subscription = new WebPush.PushSubscription(row.Endpoint, row.P256dh, row.Auth);
                await client.SendNotificationAsync(subscription, payload, vapid, cancellationToken);
            }
            catch (WebPushException exception) when (
                exception.StatusCode is HttpStatusCode.NotFound or HttpStatusCode.Gone)
            {
                expiredIds.Add(row.PushSubscriptionId);
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "No s'ha pogut enviar una notificació push a {Endpoint}.", row.Endpoint);
            }
        }

        if (expiredIds.Count > 0)
        {
            await context.PushSubscriptions
                .Where(row => expiredIds.Contains(row.PushSubscriptionId))
                .ExecuteDeleteAsync(cancellationToken);
        }
    }
}
