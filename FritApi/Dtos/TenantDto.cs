using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class TenantCreateDto
{
    [Required, MaxLength(100)]
    public string Codi { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Nom { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string AdminNombre { get; set; } = string.Empty;

    [Required, MinLength(4), MaxLength(100)]
    public string AdminPassword { get; set; } = string.Empty;
}

public class TenantDto
{
    public int TenantId { get; set; }
    public string Codi { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public int AdminUsuarioId { get; set; }
    public string AdminNombre { get; set; } = string.Empty;
}
