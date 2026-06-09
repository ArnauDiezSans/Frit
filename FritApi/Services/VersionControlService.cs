using System.Diagnostics;
using FritApi.Dtos;

namespace FritApi.Services;

public class VersionControlService
{
    public async Task<VersionControlDto> GetAsync()
    {
        var repositoryRoot = (await RunGitAsync(Directory.GetCurrentDirectory(), "rev-parse", "--show-toplevel")).Trim();
        var branch = (await RunGitAsync(repositoryRoot, "rev-parse", "--abbrev-ref", "HEAD")).Trim();
        var log = await RunGitAsync(
            repositoryRoot,
            "log",
            "-n",
            "100",
            "--date=iso-strict",
            "--pretty=format:%H%x1f%h%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e");

        return new VersionControlDto
        {
            RepositoryRoot = repositoryRoot,
            Branch = branch,
            Commits = ParseCommits(log)
        };
    }

    private static List<VersionCommitDto> ParseCommits(string value)
    {
        return value
            .Split('\u001e', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(ParseCommit)
            .Where(commit => commit is not null)
            .Select(commit => commit!)
            .ToList();
    }

    private static VersionCommitDto? ParseCommit(string value)
    {
        var parts = value.Split('\u001f');

        if (parts.Length < 6 || !DateTimeOffset.TryParse(parts[4], out var date))
        {
            return null;
        }

        return new VersionCommitDto
        {
            Hash = parts[0],
            ShortHash = parts[1],
            AuthorName = parts[2],
            AuthorEmail = parts[3],
            Date = date,
            Subject = parts[5]
        };
    }

    private static async Task<string> RunGitAsync(string workingDirectory, params string[] arguments)
    {
        using var process = new Process();
        process.StartInfo = new ProcessStartInfo
        {
            FileName = "git",
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        foreach (var argument in arguments)
        {
            process.StartInfo.ArgumentList.Add(argument);
        }

        if (!process.Start())
        {
            throw new InvalidOperationException("No s'ha pogut iniciar git.");
        }

        var outputTask = process.StandardOutput.ReadToEndAsync();
        var errorTask = process.StandardError.ReadToEndAsync();

        await process.WaitForExitAsync();

        var output = await outputTask;
        var error = await errorTask;

        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                string.IsNullOrWhiteSpace(error)
                    ? "No s'ha pogut llegir l'historial de git."
                    : error.Trim());
        }

        return output;
    }
}
