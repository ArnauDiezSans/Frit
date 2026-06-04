using System.ComponentModel.DataAnnotations;

namespace FritApi.Dtos;

public class AQueJuguemRequestDto
{
    [Range(1, int.MaxValue)]
    public int NumeroJugadores { get; set; }

    [Required]
    public List<int> UsuarioIds { get; set; } = [];
}

public class AQueJuguemRecommendationDto
{
    public int JuegoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int NumeroJugadoresMin { get; set; }
    public int NumeroJugadoresMax { get; set; }
    public int Puntuacion { get; set; }
}
