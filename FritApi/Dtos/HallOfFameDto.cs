namespace FritApi.Dtos;

public class HallOfFameDto
{
    public bool CanManageManualMedals { get; set; }
    public List<HallOfFameEntryDto> Entries { get; set; } = new();
}

public class HallOfFameEntryDto
{
    public MedalProgressDto Medal { get; set; } = new();
    public MedalUserProgressDto BestUser { get; set; } = new();
}

public class UserMedalsDto
{
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public List<MedalProgressDto> Medals { get; set; } = new();
}

public class MedalProgressDto
{
    public string MedalId { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string IconPath { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public int CurrentValue { get; set; }
    public int TargetValue { get; set; }
    public string RankName { get; set; } = string.Empty;
    public int RankLevel { get; set; }
    public string RankColor { get; set; } = string.Empty;
    public string? NextRankName { get; set; }
    public int? NextTargetValue { get; set; }
    public bool Completed { get; set; }
    public int EpicScore { get; set; }
}

public class MedalUserProgressDto
{
    public int UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public int CurrentValue { get; set; }
    public string RankName { get; set; } = string.Empty;
    public int RankLevel { get; set; }
}

public class ManualMedallaCreateDto
{
    public string Nombre { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string? IconPath { get; set; }
    public List<int> UsuarioIds { get; set; } = new();
}
