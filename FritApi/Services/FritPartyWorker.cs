namespace FritApi.Services;

public class FritPartyWorker(IServiceScopeFactory scopes, ILogger<FritPartyWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<FritPartyService>().FreezeDue();
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(ex, "No s'han pogut congelar les Fritpartys acabades.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
