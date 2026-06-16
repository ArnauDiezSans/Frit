using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class CsopaActivitatDto
{
    public int CsopaActivitatId { get; set; }
    public string Titol { get; set; } = string.Empty;
    public int Tipus { get; set; }
    public int UsuarioCreadorId { get; set; }
    public string UsuarioCreadorNombre { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool YaAsistidaPorUsuario { get; set; }
    public List<CsopaAssistenciaDto> Assistencies { get; set; } = [];
}

public class CsopaAssistenciaDto
{
    public int CsopaAssistenciaId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CsopaActivitatCreateDto
{
    [MaxLength(300)]
    public string? Titol { get; set; }

    [Required]
    [Range(1, 2)]
    public int? Tipus { get; set; }

    [Required]
    public DateOnly? Fecha { get; set; }
}

public class CsopaAssistenciaCreateDto
{
    [Required]
    public int? UsuarioId { get; set; }
}
