using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class LoginRequestDto
{
    [Required]
    public string TenantCodi { get; set; } = string.Empty;

    [Required]
    public string Nombre { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
