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

public class RemadaCreateDto
{
    [Range(1, int.MaxValue)]
    public int TempsDisponibleMinuts { get; set; }

    [Range(1, 10)]
    public int NombreJocs { get; set; }

    [Range(-1, 3)]
    public int PuntsPerJugador { get; set; }

    [Required]
    public List<int> UsuarioIds { get; set; } = [];

    [Required]
    public List<int> JuegoIds { get; set; } = [];
}

public class RemadaDto
{
    public int RemadaId { get; set; }
    public DateTime CreatedAt { get; set; }
    public int TempsDisponibleMinuts { get; set; }
    public int NombreJocs { get; set; }
    public int PuntsPerJugador { get; set; }
    public List<RemadaParticipantDto> Jugadors { get; set; } = [];
    public List<RemadaGameDto> Jocs { get; set; } = [];
}

public class RemadaParticipantDto
{
    public int UsuarioId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Punts { get; set; }
}

public class RemadaGameDto
{
    public int JuegoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int Posicion { get; set; }
}

public class RemadaUpdateDto
{
    public DateTime CreatedAt { get; set; }

    [Range(1, int.MaxValue)]
    public int TempsDisponibleMinuts { get; set; }

    [Range(1, 10)]
    public int NombreJocs { get; set; }

    [Range(-1, 3)]
    public int PuntsPerJugador { get; set; }

    [Required]
    public List<int> UsuarioIds { get; set; } = [];

    [Required]
    public List<int> JuegoIds { get; set; } = [];
}
