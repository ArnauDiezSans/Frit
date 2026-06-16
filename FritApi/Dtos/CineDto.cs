using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class CinePeliculaDto
{
    public int CinePeliculaId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public int UsuarioCreadorId { get; set; }
    public string UsuarioCreadorNombre { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int? GrupoPelicula { get; set; }
    public DateTime CierraAt { get; set; }
    public bool PuedeValorar { get; set; }
    public bool YaValoradaPorUsuario { get; set; }
    public bool YaAsistidaPorUsuario { get; set; }
    public decimal? MediaNota { get; set; }
    public List<CineValoracionDto> Valoraciones { get; set; } = [];
}

public class CineValoracionDto
{
    public int CineValoracionId { get; set; }
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public decimal? Nota { get; set; }
    public string? Observacion { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CinePeliculaCreateDto
{
    [Required]
    [MaxLength(300)]
    public string Titulo { get; set; } = string.Empty;

    [Range(1, 2)]
    public int? GrupoPelicula { get; set; }
}

public class CineValoracionCreateDto
{
    [Required]
    [Range(0, 10)]
    public decimal? Nota { get; set; }

    [MaxLength(200)]
    public string? Observacion { get; set; }
}

public class CineAsistenciaCreateDto
{
    [Required]
    public int? UsuarioId { get; set; }
}
