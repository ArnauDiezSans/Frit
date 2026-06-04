using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class ChangePasswordDto
{
    [Required]
    public string OldPassword { get; set; } = string.Empty;

    [Required]
    [MaxLength(24)]
    public string NewPassword { get; set; } = string.Empty;
}
