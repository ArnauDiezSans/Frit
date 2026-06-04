using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class UsuarioJuegoOrdenDto
{
    public int JuegoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Posicion { get; set; }
}

public class UsuarioJuegoOrdenUpdateDto
{
    [Required]
    public List<UsuarioJuegoOrdenItemDto> Juegos { get; set; } = [];
}

public class UsuarioJuegoOrdenItemDto
{
    [Required]
    public int JuegoId { get; set; }

    [Range(1, int.MaxValue)]
    public int Posicion { get; set; }
}
