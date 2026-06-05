namespace FritApi.Dtos;

public class RankingsDto
{
    public RankingResumenDto Resumen { get; set; } = new();
    public List<RankingJuegoDto> Juegos { get; set; } = new();
    public List<RankingUsuarioDto> Usuarios { get; set; } = new();
    public List<RankingVictoriaJuegoDto> VictoriasPorJuego { get; set; } = new();
    public List<RankingPeriodoDto> Periodos { get; set; } = new();
}

public class RankingResumenDto
{
    public int PartidasTotales { get; set; }
    public decimal HorasTotales { get; set; }
    public int? PartidaMasLargaMinutos { get; set; }
    public int JuegosConPartidas { get; set; }
}

public class RankingJuegoDto
{
    public int JuegoId { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public int NumeroPartidas { get; set; }
    public int DuracionTotalMinutos { get; set; }
    public int? DuracionMediaMinutos { get; set; }
    public decimal? Pvp { get; set; }
    public decimal? PrecioPorPartida { get; set; }
    public DateOnly? UltimaPartida { get; set; }
}

public class RankingUsuarioDto
{
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int PartidasTotales { get; set; }
    public int Victorias { get; set; }
    public decimal PorcentajeVictoria { get; set; }
}

public class RankingVictoriaJuegoDto
{
    public int JuegoId { get; set; }
    public string JuegoNombre { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int PartidasTotales { get; set; }
    public int Victorias { get; set; }
    public decimal PorcentajeVictoria { get; set; }
}

public class RankingPeriodoDto
{
    public string Periodo { get; set; } = string.Empty;
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int PartidasTotales { get; set; }
    public int Victorias { get; set; }
    public decimal PorcentajeVictoria { get; set; }
}
