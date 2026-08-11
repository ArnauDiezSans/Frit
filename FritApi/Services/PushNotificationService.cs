using System.Net;
using System.Text.Json;
using FritApi.Data;
using FritApi.Dtos;
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

    public async Task<NotificationPreferenceDto> GetPreferencesAsync(int usuarioId)
    {
        var preference = await GetOrCreatePreferenceAsync(usuarioId);
        return ToDto(preference);
    }

    public async Task<NotificationPreferenceDto> UpdatePreferencesAsync(int usuarioId, NotificationPreferenceDto dto)
    {
        var preference = await GetOrCreatePreferenceAsync(usuarioId);
        preference.NuevaPartida = dto.NuevaPartida;
        preference.NuevaRemada = dto.NuevaRemada;
        preference.VotacionPelicula = dto.VotacionPelicula;
        preference.Encuesta = dto.Encuesta;
        preference.CambioPreferenciaJuego = dto.CambioPreferenciaJuego;
        preference.PuntuacionMinima = dto.PuntuacionMinima;
        preference.RecordatorioDomingo = dto.RecordatorioDomingo;
        preference.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
        return ToDto(preference);
    }

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

    public async Task SendNewGameAsync(int partidaId, int creatorUserId, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            logger.LogWarning("No s'ha enviat la notificació perquè les claus VAPID no estan configurades.");
            return;
        }

        try
        {
            var partida = await context.Partidas.AsNoTracking()
                .Where(row => row.PartidaId == partidaId)
                .Select(row => new
                {
                    GameName = row.Juego.Nombre,
                    Players = row.Jugadores.OrderBy(player => player.Posicion)
                        .Select(player => new { player.NombreMostrado, player.Puntos })
                        .ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);
            if (partida is null) return;
            var subscriptions = await GetCategorySubscriptionsAsync(
                preference => preference.NuevaPartida,
                creatorUserId,
                false,
                cancellationToken);

            await SendAsync(
                subscriptions,
                "Nova partida registrada",
                BuildPlayerScores(partida.GameName, partida.Players.Select(player => (player.NombreMostrado, player.Puntos))),
                $"/app/partidas?partidaId={partidaId}",
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No s'han pogut preparar les notificacions de la partida {PartidaId}.", partidaId);
        }
    }

    public async Task SendRemadaAsync(int creatorUserId, IReadOnlyCollection<int> participantIds, int pointsPerPlayer, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured) return;
        try
        {
            var names = await context.Usuarios.AsNoTracking()
                .Where(user => participantIds.Contains(user.UsuarioId))
                .Select(user => user.Nombre)
                .ToListAsync(cancellationToken);
            var subscriptions = await GetCategorySubscriptionsAsync(
                preference => preference.NuevaRemada,
                creatorUserId,
                false,
                cancellationToken);
            var participants = names.Count == 0
                ? "Uns usuaris"
                : string.Join(", ", names.Select(name => $"{name}: {pointsPerPlayer} punts"));
            await SendAsync(subscriptions, "Nova remada", $"{participants}.", "/app/remar", cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No s'han pogut preparar les notificacions de la remada.");
        }
    }

    public async Task SendMovieVotingAsync(int usuarioId, int peliculaId, string title, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured) return;
        try
        {
            var enabled = await context.NotificationPreferences.AsNoTracking()
                .AnyAsync(row => row.UsuarioId == usuarioId && row.VotacionPelicula, cancellationToken);
            if (!enabled) return;
            var subscriptions = await context.PushSubscriptions.AsNoTracking()
                .Where(row => row.UsuarioId == usuarioId)
                .ToListAsync(cancellationToken);
            await SendAsync(subscriptions, "Ja pots votar", $"Ja pots valorar {title}.", $"/app/cine?peliculaId={peliculaId}", cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No s'ha pogut preparar la notificació de votació de la pel·lícula {PeliculaId}.", peliculaId);
        }
    }

    public async Task SendSurveyAsync(int creatorUserId, string title, string url, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured) return;
        var subscriptions = await GetCategorySubscriptionsAsync(
            preference => preference.Encuesta,
            creatorUserId,
            false,
            cancellationToken);
        await SendAsync(subscriptions, "Nova enquesta", title, url, cancellationToken);
    }

    public async Task SendGamePreferenceChangesAsync(
        int actorUserId,
        string actorName,
        IReadOnlyCollection<GameScoreChange> changes,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured || changes.Count == 0) return;
        try
        {
            var preferences = await context.NotificationPreferences.AsNoTracking()
                .Where(row => row.CambioPreferenciaJuego && row.UsuarioId != actorUserId)
                .ToListAsync(cancellationToken);
            foreach (var group in preferences.GroupBy(preference => preference.PuntuacionMinima))
            {
                var relevantChanges = changes.Where(change =>
                    change.OldScore >= group.Key || change.NewScore >= group.Key).ToList();
                if (relevantChanges.Count == 0) continue;
                var recipientIds = group.Select(preference => preference.UsuarioId).ToList();
                var subscriptions = await context.PushSubscriptions.AsNoTracking()
                    .Where(row => recipientIds.Contains(row.UsuarioId))
                    .ToListAsync(cancellationToken);
                var firstChange = relevantChanges[0];
                var body = relevantChanges.Count == 1
                    ? $"{actorName} ha canviat {firstChange.GameName} de {firstChange.OldScore} a {firstChange.NewScore}."
                    : $"{actorName} ha canviat {relevantChanges.Count} preferències dins del teu rang.";
                await SendAsync(subscriptions, "Preferències de jocs", body, "/app/usuario", cancellationToken);
            }
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No s'han pogut preparar les notificacions de preferències de {UsuarioId}.", actorUserId);
        }
    }

    public async Task SendSundayGreetingAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
        {
            logger.LogWarning("No s'ha enviat la notificació de diumenge perquè les claus VAPID no estan configurades.");
            return;
        }

        var subscriptions = await GetCategorySubscriptionsAsync(
            preference => preference.RecordatorioDomingo,
            null,
            true,
            cancellationToken);

        await SendAsync(
            subscriptions,
            "Frit",
            "Bon diumenge",
            "/",
            cancellationToken);
    }

    private async Task<List<Models.PushSubscription>> GetCategorySubscriptionsAsync(
        System.Linq.Expressions.Expression<Func<NotificationPreference, bool>> categoryFilter,
        int? excludedUserId,
        bool ignoreQueryFilters,
        CancellationToken cancellationToken)
    {
        var preferenceQuery = context.NotificationPreferences.AsNoTracking();
        var subscriptionQuery = context.PushSubscriptions.AsNoTracking();
        if (ignoreQueryFilters)
        {
            preferenceQuery = preferenceQuery.IgnoreQueryFilters();
            subscriptionQuery = subscriptionQuery.IgnoreQueryFilters();
        }
        var recipientIds = await preferenceQuery
            .Where(categoryFilter)
            .Where(row => !excludedUserId.HasValue || row.UsuarioId != excludedUserId.Value)
            .Select(row => row.UsuarioId)
            .ToListAsync(cancellationToken);
        return await subscriptionQuery.Where(row => recipientIds.Contains(row.UsuarioId)).ToListAsync(cancellationToken);
    }

    private async Task<NotificationPreference> GetOrCreatePreferenceAsync(int usuarioId)
    {
        var preference = await context.NotificationPreferences.FirstOrDefaultAsync(row => row.UsuarioId == usuarioId);
        if (preference is not null) return preference;
        preference = new NotificationPreference { UsuarioId = usuarioId };
        context.NotificationPreferences.Add(preference);
        await context.SaveChangesAsync();
        return preference;
    }

    private static NotificationPreferenceDto ToDto(NotificationPreference preference) => new()
    {
        NuevaPartida = preference.NuevaPartida,
        NuevaRemada = preference.NuevaRemada,
        VotacionPelicula = preference.VotacionPelicula,
        Encuesta = preference.Encuesta,
        CambioPreferenciaJuego = preference.CambioPreferenciaJuego,
        PuntuacionMinima = preference.PuntuacionMinima,
        RecordatorioDomingo = preference.RecordatorioDomingo
    };

    private static string BuildPlayerScores(string gameName, IEnumerable<(string Name, decimal? Points)> players)
    {
        var details = string.Join(", ", players.Select(player =>
            player.Points.HasValue ? $"{player.Name}: {player.Points:0.##} punts" : $"{player.Name}: sense punts"));
        return string.IsNullOrWhiteSpace(details)
            ? $"S'ha registrat una partida de {gameName}."
            : $"{gameName} — {details}.";
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

public sealed record GameScoreChange(string GameName, int OldScore, int NewScore);
