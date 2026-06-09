namespace FritApi.Dtos;

public class VersionControlDto
{
    public string RepositoryRoot { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public List<VersionCommitDto> Commits { get; set; } = new();
}

public class VersionCommitDto
{
    public string Hash { get; set; } = string.Empty;
    public string ShortHash { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string AuthorEmail { get; set; } = string.Empty;
    public DateTimeOffset Date { get; set; }
    public string Subject { get; set; } = string.Empty;
}
