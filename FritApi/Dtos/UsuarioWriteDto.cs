using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class UsuarioWriteDto
{
    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Grupo { get; set; }

    [MaxLength(800)]
    public string? Observaciones { get; set; }

    [Required]
    [MinLength(4)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class UsuarioProfileUpdateDto
{
    [Required]
    [MaxLength(200)]
    public string Nombre { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? Grupo { get; set; }

    [MaxLength(800)]
    public string? Observaciones { get; set; }

    [RegularExpression("^#[0-9A-Fa-f]{6}$")]
    public string? Color { get; set; }
}
