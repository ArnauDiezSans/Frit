using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public sealed class PushSubscriptionDto
{
    [Required, MaxLength(2000)]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    public PushSubscriptionKeysDto Keys { get; set; } = new();
}

public sealed class PushSubscriptionKeysDto
{
    [Required, MaxLength(500)]
    public string P256dh { get; set; } = string.Empty;

    [Required, MaxLength(500)]
    public string Auth { get; set; } = string.Empty;
}

public sealed class PushEndpointDto
{
    [Required, MaxLength(2000)]
    public string Endpoint { get; set; } = string.Empty;
}

public sealed record PushConfigurationDto(bool Configured, string? PublicKey);
