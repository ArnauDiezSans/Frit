namespace FritApi.Services;

public interface IBggMedalImageService
{
    Task EnsureGameMedalImageAsync(int juegoId, int bggId);
}
