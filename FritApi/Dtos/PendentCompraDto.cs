using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class PendentCompraDto
{
    public int PendentCompraId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int Quantitat { get; set; }
    public string Descripcio { get; set; } = string.Empty;
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PendentCompraWriteDto
{
    [Range(1, int.MaxValue)]
    public int Quantitat { get; set; }

    [Required]
    [MaxLength(500)]
    public string Descripcio { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Link { get; set; }
}

public class PendentCompraDeleteSelectedDto
{
    [Required]
    public List<int> Ids { get; set; } = [];
}
