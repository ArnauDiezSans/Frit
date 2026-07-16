using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class RegisterRequestDto
{
    [Required, MaxLength(100)]
    public string TenantCodi { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [Required, MinLength(4), MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}
