using System.Security.Claims;
using System.Net;
using FritApi.Dtos;
using FritApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FritApi.Controllers;

[ApiController]
[Authorize]
[Route("api/notificaciones")]
public sealed class NotificacionesController(PushNotificationService pushService) : ControllerBase
{
    [HttpGet("configuracion")]
    public ActionResult<PushConfigurationDto> GetConfiguration() =>
        Ok(new PushConfigurationDto(pushService.IsConfigured, pushService.IsConfigured ? pushService.PublicKey : null));

    [HttpGet("preferencias")]
    public async Task<ActionResult<NotificationPreferenceDto>> GetPreferences()
    {
        if (!TryGetUserId(out var usuarioId)) return Unauthorized();
        return Ok(await pushService.GetPreferencesAsync(usuarioId));
    }

    [HttpPut("preferencias")]
    public async Task<ActionResult<NotificationPreferenceDto>> UpdatePreferences([FromBody] NotificationPreferenceDto dto)
    {
        if (!TryGetUserId(out var usuarioId)) return Unauthorized();
        return Ok(await pushService.UpdatePreferencesAsync(usuarioId, dto));
    }

    [HttpPost("suscripciones")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscriptionDto dto)
    {
        if (!TryGetUserId(out var usuarioId))
        {
            return Unauthorized();
        }

        if (!pushService.IsConfigured)
        {
            return Problem("Les notificacions no estan configurades al servidor.", statusCode: 503);
        }

        if (!IsSafePushEndpoint(dto.Endpoint))
        {
            return BadRequest(new { message = "L'endpoint de notificacions no és vàlid." });
        }

        await pushService.UpsertAsync(usuarioId, dto.Endpoint, dto.Keys.P256dh, dto.Keys.Auth);
        return NoContent();
    }

    [HttpDelete("suscripciones")]
    public async Task<IActionResult> Unsubscribe([FromBody] PushEndpointDto dto)
    {
        if (!TryGetUserId(out var usuarioId))
        {
            return Unauthorized();
        }

        await pushService.RemoveAsync(usuarioId, dto.Endpoint);
        return NoContent();
    }

    [HttpPost("prueba")]
    public async Task<IActionResult> Test([FromBody] PushEndpointDto dto, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var usuarioId))
        {
            return Unauthorized();
        }

        if (!pushService.IsConfigured)
        {
            return Problem("Les notificacions no estan configurades al servidor.", statusCode: 503);
        }

        return await pushService.SendTestAsync(usuarioId, dto.Endpoint, cancellationToken)
            ? NoContent()
            : NotFound(new { message = "No s'ha trobat la subscripció d'aquest dispositiu." });
    }

    private bool TryGetUserId(out int usuarioId) =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out usuarioId);

    private static bool IsSafePushEndpoint(string endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps ||
            string.IsNullOrWhiteSpace(uri.Host) ||
            uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!IPAddress.TryParse(uri.Host, out var address))
        {
            return uri.Host.Contains('.');
        }

        return !IPAddress.IsLoopback(address) &&
               !address.IsIPv6LinkLocal &&
               !address.IsIPv6SiteLocal &&
               !(address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork &&
                 (address.GetAddressBytes()[0] == 10 ||
                  address.GetAddressBytes()[0] == 127 ||
                  (address.GetAddressBytes()[0] == 192 && address.GetAddressBytes()[1] == 168) ||
                  (address.GetAddressBytes()[0] == 172 && address.GetAddressBytes()[1] is >= 16 and <= 31)));
    }
}
