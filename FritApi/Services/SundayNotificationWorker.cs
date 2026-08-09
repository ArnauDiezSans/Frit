namespace FritApi.Services;

public sealed class SundayNotificationWorker(
    IServiceScopeFactory scopeFactory,
    TimeProvider timeProvider,
    ILogger<SundayNotificationWorker> logger) : BackgroundService
{
    private static readonly TimeZoneInfo MadridTimeZone = FindMadridTimeZone();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var nextRunUtc = GetNextRunUtc(timeProvider.GetUtcNow());
            logger.LogInformation(
                "La pròxima notificació de diumenge s'enviarà a {NextRunUtc} UTC.",
                nextRunUtc);

            try
            {
                await Task.Delay(nextRunUtc - timeProvider.GetUtcNow(), timeProvider, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }

            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var pushService = scope.ServiceProvider.GetRequiredService<PushNotificationService>();
                await pushService.SendSundayGreetingAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "No s'ha pogut enviar la notificació de diumenge.");
            }
        }
    }

    public static DateTimeOffset GetNextRunUtc(DateTimeOffset nowUtc)
    {
        var localNow = TimeZoneInfo.ConvertTime(nowUtc, MadridTimeZone);
        var daysUntilSunday = ((int)DayOfWeek.Sunday - (int)localNow.DayOfWeek + 7) % 7;
        var localRun = localNow.Date.AddDays(daysUntilSunday).AddHours(8);

        if (localRun <= localNow.DateTime)
        {
            localRun = localRun.AddDays(7);
        }

        var utcRun = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(localRun, DateTimeKind.Unspecified),
            MadridTimeZone);
        return new DateTimeOffset(utcRun);
    }

    private static TimeZoneInfo FindMadridTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Madrid");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Romance Standard Time");
        }
    }
}
