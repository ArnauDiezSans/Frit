using FritApi.Models;

namespace FritApi.Dtos;

public record EncuestaOpcionDto(int EncuestaOpcionId, string Texto, int Orden);
public record EncuestaPreguntaDto(int EncuestaPreguntaId, EncuestaPreguntaTipo Tipo, string Texto, string? Ayuda,
    bool Obligatoria, int Orden, int? Minimo, int? Maximo, int? CondicionPreguntaOrden,
    int? CondicionOpcionOrden, List<EncuestaOpcionDto> Opciones);
public record EncuestaResumenDto(int EncuestaId, string Titulo, string? Descripcion, EncuestaEstado Estado,
    bool EsVotacion, bool EsAnonima, DateTime? FechaCierre, DateTime CreatedAt, string CreadorNombre, bool HaRespondido,
    bool EsDestinatario, int Respuestas, int Destinatarios, bool PuedeGestionar);
public record EncuestaRespuestaValorDto(int EncuestaPreguntaId, string? Texto, int? Numero, List<int> OpcionIds);
public record EncuestaResultadoOpcionDto(int EncuestaOpcionId, string Texto, int Votos, decimal Porcentaje,
    List<string>? Votantes);
public record EncuestaResultadoPreguntaDto(int EncuestaPreguntaId, string Texto, EncuestaPreguntaTipo Tipo,
    int Respuestas, decimal? Media, List<EncuestaResultadoOpcionDto> Opciones, List<string> Textos);
public record EncuestaDetalleDto(EncuestaResumenDto Resumen, bool PermiteEditarRespuesta,
    EncuestaVisibilidadResultados VisibilidadResultados, List<EncuestaPreguntaDto> Preguntas,
    List<EncuestaRespuestaValorDto>? MiRespuesta, List<EncuestaResultadoPreguntaDto>? Resultados,
    List<string>? Pendientes, List<int>? DestinatarioIds);

public class EncuestaWriteDto
{
    public bool EsVotacion { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string? Descripcion { get; set; }
    public bool EsAnonima { get; set; }
    public bool PermiteEditarRespuesta { get; set; } = true;
    public EncuestaVisibilidadResultados VisibilidadResultados { get; set; }
    public DateTime? FechaCierre { get; set; }
    public List<int> DestinatarioIds { get; set; } = [];
    public List<EncuestaPreguntaWriteDto> Preguntas { get; set; } = [];
}

public class EncuestaPreguntaWriteDto
{
    public EncuestaPreguntaTipo Tipo { get; set; }
    public string Texto { get; set; } = string.Empty;
    public string? Ayuda { get; set; }
    public bool Obligatoria { get; set; } = true;
    public int? Minimo { get; set; }
    public int? Maximo { get; set; }
    public int? CondicionPreguntaOrden { get; set; }
    public int? CondicionOpcionOrden { get; set; }
    public List<string> Opciones { get; set; } = [];
}

public record EncuestaSubmitDto(List<EncuestaRespuestaValorDto> Respuestas);
