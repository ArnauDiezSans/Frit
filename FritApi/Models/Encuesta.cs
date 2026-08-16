using System.ComponentModel.DataAnnotations;

namespace FritApi.Models;

public enum EncuestaEstado { Borrador, Publicada, Cerrada }
public enum EncuestaVisibilidadResultados { Administradores, DespuesDeResponder, AlCerrar, Siempre }
public enum EncuestaPreguntaTipo { OpcionUnica, OpcionMultiple, TextoCorto, TextoLargo, Escala }

public class Encuesta : ITenantEntity
{
    public int EncuestaId { get; set; }
    public int TenantId { get; set; }
    public int UsuarioCreadorId { get; set; }
    public Usuario UsuarioCreador { get; set; } = null!;
    [Required, MaxLength(200)] public string Titulo { get; set; } = string.Empty;
    [MaxLength(1200)] public string? Descripcion { get; set; }
    public EncuestaEstado Estado { get; set; }
    public bool EsVotacion { get; set; }
    public bool EsAnonima { get; set; }
    public bool PermiteEditarRespuesta { get; set; } = true;
    public EncuestaVisibilidadResultados VisibilidadResultados { get; set; }
    public DateTime? FechaCierre { get; set; }
    public DateTime? PublicadaAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<EncuestaPregunta> Preguntas { get; set; } = [];
    public ICollection<EncuestaDestinatario> Destinatarios { get; set; } = [];
    public ICollection<EncuestaRespuesta> Respuestas { get; set; } = [];
}

public class EncuestaPregunta : ITenantEntity
{
    public int EncuestaPreguntaId { get; set; }
    public int TenantId { get; set; }
    public int EncuestaId { get; set; }
    public Encuesta Encuesta { get; set; } = null!;
    public EncuestaPreguntaTipo Tipo { get; set; }
    [Required, MaxLength(500)] public string Texto { get; set; } = string.Empty;
    [MaxLength(800)] public string? Ayuda { get; set; }
    public bool Obligatoria { get; set; } = true;
    public int Orden { get; set; }
    public int? Minimo { get; set; }
    public int? Maximo { get; set; }
    public int? CondicionPreguntaOrden { get; set; }
    public int? CondicionOpcionOrden { get; set; }
    public ICollection<EncuestaOpcion> Opciones { get; set; } = [];
}

public class EncuestaOpcion : ITenantEntity
{
    public int EncuestaOpcionId { get; set; }
    public int TenantId { get; set; }
    public int EncuestaPreguntaId { get; set; }
    public EncuestaPregunta Pregunta { get; set; } = null!;
    [Required, MaxLength(300)] public string Texto { get; set; } = string.Empty;
    public int Orden { get; set; }
}

public class EncuestaDestinatario : ITenantEntity
{
    public int EncuestaDestinatarioId { get; set; }
    public int TenantId { get; set; }
    public int EncuestaId { get; set; }
    public Encuesta Encuesta { get; set; } = null!;
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
}

public class EncuestaRespuesta : ITenantEntity
{
    public int EncuestaRespuestaId { get; set; }
    public int TenantId { get; set; }
    public int EncuestaId { get; set; }
    public Encuesta Encuesta { get; set; } = null!;
    public int UsuarioId { get; set; }
    public Usuario Usuario { get; set; } = null!;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<EncuestaRespuestaValor> Valores { get; set; } = [];
}

public class EncuestaRespuestaValor : ITenantEntity
{
    public int EncuestaRespuestaValorId { get; set; }
    public int TenantId { get; set; }
    public int EncuestaRespuestaId { get; set; }
    public EncuestaRespuesta Respuesta { get; set; } = null!;
    public int EncuestaPreguntaId { get; set; }
    public EncuestaPregunta Pregunta { get; set; } = null!;
    [MaxLength(4000)] public string? Texto { get; set; }
    public int? Numero { get; set; }
    public ICollection<EncuestaRespuestaOpcion> Opciones { get; set; } = [];
}

public class EncuestaRespuestaOpcion : ITenantEntity
{
    public int EncuestaRespuestaOpcionId { get; set; }
    public int TenantId { get; set; }
    public int EncuestaRespuestaValorId { get; set; }
    public EncuestaRespuestaValor Valor { get; set; } = null!;
    public int EncuestaOpcionId { get; set; }
    public EncuestaOpcion Opcion { get; set; } = null!;
}
