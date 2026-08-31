using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public partial class EconomiaService(AppDbContext db)
{
    private static readonly CultureInfo Ca = CultureInfo.GetCultureInfo("ca-ES");
    private static readonly HashSet<string> ExpenseCategories = ["Lloguer", "Llum", "Internet", "Aigua", "Neteja", "Altres"];
    private static readonly string[] Mesos = ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"];

    public async Task EnsureSeededAsync()
    {
        if (await db.EconomiaMoviments.AnyAsync())
        {
            await RepairHistoricalDataAsync();
            await EnsureHistoricalGridAsync();
            await LinkHistoricalAllocationsAsync();
            return;
        }
        var bankPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "economia-bank.csv");
        var sheetPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "economia-sheet.csv");
        if (!File.Exists(bankPath) || !File.Exists(sheetPath)) return;

        var bankRows = ParseDelimited(await File.ReadAllTextAsync(bankPath), ';').Skip(1).Where(r => r.Count >= 5).ToList();
        foreach (var row in bankRows)
        {
            if (!TryDate(row[0], out var data) || !TryDate(row[1], out var valor) || !TryMoney(row[3], out var import)) continue;
            TryMoney(row[4], out var saldo);
            var original = row[2].Trim();
            db.EconomiaMoviments.Add(new EconomiaMoviment { Data = data, DataValor = valor, DescriptorOriginal = original, Descriptor = original, Import = import, Saldo = saldo, Empremta = Fingerprint(data, valor, import, saldo, original) });
        }
        await db.SaveChangesAsync();
        await RepairHistoricalDataAsync();
        await EnsureHistoricalGridAsync();
        await LinkHistoricalAllocationsAsync();

        var sheetRows = ParseDelimited(await File.ReadAllTextAsync(sheetPath), ',').Skip(1).Where(r => r.Count >= 3).ToList();
        DateOnly lastSheetDate = default;
        foreach (var row in sheetRows)
        {
            if (!TryDate(row[0], out var data) || !TryMoney(row[1], out var import)) continue;
            if (data > lastSheetDate) lastSheetDate = data;
            db.EconomiaImputacions.AddRange(Classify(data, import, row[2].Trim(), linked: false));
        }

        var newBankRows = await db.EconomiaMoviments.Where(m => m.Data > lastSheetDate).ToListAsync();
        foreach (var movement in newBankRows) db.EconomiaImputacions.AddRange(Classify(movement.Data, movement.Import, movement.Descriptor, linked: true, movement.EconomiaMovimentId));
        await db.SaveChangesAsync();
    }

    public async Task<EconomiaDashboardDto> GetAsync()
    {
        await EnsureSeededAsync();
        var allocations = await db.EconomiaImputacions.AsNoTracking().Where(x => x.Categoria != "QuotaEsborrada").ToListAsync();
        var movementDates = await db.EconomiaMoviments.AsNoTracking().ToDictionaryAsync(x => x.EconomiaMovimentId, x => x.Data);
        var latest = await db.EconomiaMoviments.AsNoTracking().OrderByDescending(x => x.Data).ThenByDescending(x => x.EconomiaMovimentId).FirstOrDefaultAsync();
        var totals = allocations.GroupBy(x => x.Categoria).Select(g =>
        {
            var isExpense = g.Key is "Lloguer" or "Llum" or "Internet" or "Aigua" or "Neteja";
            var amount = isExpense ? g.Where(x => x.EconomiaMovimentId != null).Sum(x => x.Import) : g.Sum(x => x.Import);
            return new EconomiaTotalDto(g.Key, isExpense ? Math.Abs(amount) : amount);
        }).OrderBy(x => x.Categoria).ToList();
        totals.Insert(0, new EconomiaTotalDto("Saldo", latest?.Saldo ?? allocations.Sum(x => x.Import)));
        var quotes = allocations.Where(x => x.Categoria == "Quota" && x.Persona != null && x.Periode != null).Select(x => new EconomiaQuotaDto(x.Persona!, x.Periode!.Value.Year, x.Periode.Value.Month, x.Import, x.EconomiaMovimentId, x.EconomiaMovimentId is { } id && movementDates.TryGetValue(id, out var movementDate) ? movementDate : null, x.Origen == "GraellaSheet" && x.EconomiaMovimentId == null)).ToList();
        var movements = await db.EconomiaMoviments.AsNoTracking().Include(x => x.Imputacions).OrderByDescending(x => x.Data).ThenByDescending(x => x.EconomiaMovimentId).Select(x => new EconomiaMovimentDto(x.EconomiaMovimentId, x.Data, x.DataValor, x.DescriptorOriginal, x.Descriptor, x.Import, x.Saldo, x.Imputacions.Select(i => i.Categoria).FirstOrDefault() ?? "Sense classificar", x.Imputacions.Any(i => i.RequereixRevisio), x.Imputacions.Sum(i => i.Import), x.Imputacions.Any())).ToListAsync();
        var anys = quotes.Select(x => x.Any).Distinct().OrderByDescending(x => x).ToList();
        return new EconomiaDashboardDto(totals, quotes, movements, anys);
    }

    public async Task<IReadOnlyList<EconomiaPreviewRowDto>> PreviewAsync(string text)
    {
        await EnsureSeededAsync();
        var rows = ParseInput(text); var result = new List<EconomiaPreviewRowDto>();
        foreach (var row in rows)
        {
            var fingerprint = Fingerprint(row.Data, row.DataValor, row.Import, row.Saldo ?? 0, row.Original);
            var duplicate = await db.EconomiaMoviments.AnyAsync(x => x.Empremta == fingerprint);
            var allocations = Classify(row.Data, row.Import, row.Original, true);
            result.Add(new(row.Data, row.DataValor, row.Original, row.Original, row.Import, row.Saldo, allocations.FirstOrDefault()?.Categoria ?? "Altres", allocations.Any(x => x.RequereixRevisio), allocations.Where(x => x.Periode != null && x.Persona != null).Select(x => new EconomiaQuotaDto(x.Persona!, x.Periode!.Value.Year, x.Periode.Value.Month, x.Import, null)).ToList(), duplicate));
        }
        return result;
    }

    public async Task<EconomiaImportResultDto> ImportAsync(IReadOnlyList<EconomiaPreviewRowDto> rows)
    {
        var imported = 0; var duplicates = 0; var reviews = 0;
        foreach (var row in rows)
        {
            var balance = row.Saldo ?? 0; var fp = Fingerprint(row.Data, row.DataValor, row.Import, balance, row.DescriptorOriginal);
            if (await db.EconomiaMoviments.AnyAsync(x => x.Empremta == fp)) { duplicates++; continue; }
            var movement = new EconomiaMoviment { Data = row.Data, DataValor = row.DataValor, DescriptorOriginal = row.DescriptorOriginal.Trim(), Descriptor = row.Descriptor.Trim(), Import = row.Import, Saldo = row.Saldo, Empremta = fp };
            db.EconomiaMoviments.Add(movement); await db.SaveChangesAsync();
            var allocations = Classify(row.Data, row.Import, movement.Descriptor, true, movement.EconomiaMovimentId); reviews += allocations.Count(x => x.RequereixRevisio); db.EconomiaImputacions.AddRange(allocations); imported++;
        }
        await db.SaveChangesAsync(); return new(imported, duplicates, reviews);
    }

    public async Task<bool> UpdateDescriptorAsync(int id, string descriptor)
    {
        var movement = await db.EconomiaMoviments.Include(x => x.Imputacions).FirstOrDefaultAsync(x => x.EconomiaMovimentId == id);
        if (movement is null) return false;
        movement.Descriptor = descriptor.Trim();
        db.EconomiaImputacions.RemoveRange(movement.Imputacions);
        db.EconomiaImputacions.AddRange(Classify(movement.Data, movement.Import, movement.Descriptor, true, movement.EconomiaMovimentId));
        await db.SaveChangesAsync(); return true;
    }

    public async Task<string?> UpdateCategoryAsync(int id, string category)
    {
        var normalizedCategory = ExpenseCategories.FirstOrDefault(x => x.Equals(category?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (normalizedCategory is null) return "Categoria no vàlida.";
        var movement = await db.EconomiaMoviments.Include(x => x.Imputacions).FirstOrDefaultAsync(x => x.EconomiaMovimentId == id);
        if (movement is null) return "Moviment no trobat.";
        if (movement.Import >= 0 && normalizedCategory != "Altres") return "Els ingressos només es poden classificar com a quota o altres.";
        db.EconomiaImputacions.RemoveRange(movement.Imputacions);
        db.EconomiaImputacions.Add(new EconomiaImputacio { EconomiaMovimentId = id, Categoria = normalizedCategory, Import = movement.Import, Descriptor = movement.Descriptor, RequereixRevisio = false, Origen = "Manual" });
        await db.SaveChangesAsync();
        return null;
    }

    public async Task<string?> AssignQuotaAsync(int id, EconomiaAssignacioRequest request)
    {
        if (request.Any is < 2020 or > 2100 || request.Mes is < 1 or > 12 || request.Import <= 0 || string.IsNullOrWhiteSpace(request.Persona)) return "Assignació no vàlida.";
        var movement = await db.EconomiaMoviments.Include(x => x.Imputacions).FirstOrDefaultAsync(x => x.EconomiaMovimentId == id);
        if (movement is null) return "Moviment no trobat.";
        if (movement.Import <= 0) return "Només es poden assignar quotes a moviments d'ingrés.";
        var remaining = movement.Import - movement.Imputacions.Where(x => x.Categoria == "Quota").Sum(x => x.Import);
        if (request.Import > remaining) return $"L'import supera el pendent de {remaining:0.00} €.";
        if (!movement.Imputacions.Any(x => x.Categoria == "Quota")) db.EconomiaImputacions.RemoveRange(movement.Imputacions.Where(x => x.Categoria != "Quota"));
        var period = new DateOnly(request.Any, request.Mes, 1); var person = request.Persona.Trim();
        db.EconomiaImputacions.Add(new EconomiaImputacio { EconomiaMovimentId = id, Categoria = "Quota", Persona = person, Periode = period, Import = request.Import, Descriptor = $"Quota {Mesos[request.Mes - 1]}{request.Any % 100:00} {person}", Origen = "Manual" });
        await db.SaveChangesAsync(); return null;
    }

    public async Task<bool> UndoAssignmentsAsync(int id)
    {
        var rows = await db.EconomiaImputacions.Where(x => x.EconomiaMovimentId == id).ToListAsync();
        if (rows.Count == 0) return false;
        db.EconomiaImputacions.RemoveRange(rows); await db.SaveChangesAsync(); return true;
    }

    public async Task<string?> DeleteInheritedQuotaAsync(string persona, int any, int mes)
    {
        if (string.IsNullOrWhiteSpace(persona) || any is < 2020 or > 2100 || mes is < 1 or > 12) return "Quota no vàlida.";
        var period = new DateOnly(any, mes, 1);
        var rows = await db.EconomiaImputacions.Where(x => x.Categoria == "Quota" && x.Persona == persona.Trim() && x.Periode == period && x.EconomiaMovimentId == null && x.Origen == "GraellaSheet").ToListAsync();
        if (rows.Count == 0) return "No s'ha trobat cap import heretat sense moviment vinculat.";
        foreach (var row in rows) row.Categoria = "QuotaEsborrada";
        await db.SaveChangesAsync();
        return null;
    }

    public async Task<EconomiaAutoAssignacioResultDto> AutoAssignAsync()
    {
        await EnsureSeededAsync();
        var movements = await db.EconomiaMoviments.Include(x => x.Imputacions).Where(x => !x.Imputacions.Any()).ToListAsync();
        var cutoff = await GetHistoricalCutoffAsync(); var assigned = 0;
        foreach (var movement in movements)
        {
            var allocations = Classify(movement.Data, movement.Import, movement.Descriptor, true, movement.EconomiaMovimentId);
            if (allocations.Count == 0 || allocations.Any(x => x.RequereixRevisio || x.Categoria == "Altres")) continue;
            if (allocations.Any(x => x.Categoria == "Quota") && movement.Data <= cutoff) continue;
            foreach (var allocation in allocations) allocation.Origen = "Automatic";
            db.EconomiaImputacions.AddRange(allocations); assigned++;
        }
        await db.SaveChangesAsync();
        return new EconomiaAutoAssignacioResultDto(assigned, movements.Count - assigned);
    }

    private async Task<DateOnly> GetHistoricalCutoffAsync()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "economia-sheet.csv");
        if (!File.Exists(path)) return DateOnly.MinValue;
        var dates = new List<DateOnly>();
        foreach (var row in ParseDelimited(await File.ReadAllTextAsync(path), ',').Skip(1)) if (row.Count > 0 && TryDate(row[0], out var date)) dates.Add(date);
        return dates.Count == 0 ? DateOnly.MinValue : dates.Max();
    }

    private static List<EconomiaImputacio> Classify(DateOnly data, decimal import, string descriptor, bool linked, int? movementId = null)
    {
        var clean = descriptor.Trim(); var normalized = RemoveAccents(clean).ToUpperInvariant();
        var category = normalized.Contains("LLOGUER") || normalized.Contains("FINQUES ARAGONES") ? "Lloguer" : normalized.Contains("LLUM") || normalized.Contains("ENDESA") || normalized.Contains("OCTOPUS") ? "Llum" : normalized.Contains("INTERNET") || normalized.Contains("FINETWORK") ? "Internet" : normalized.Contains("AIGUA") || normalized.Contains("AIGUES") ? "Aigua" : normalized.Contains("NETEJA") ? "Neteja" : normalized.Contains("BAR") ? "Bar" : normalized.Contains("QUOTA") || import == 40 || import == 80 || import == 120 || import == 140 || import == 160 || import == 200 || import == 240 ? "Quota" : "Altres";
        if (category != "Quota") return [New(category, null, null, import, clean, category == "Altres", linked, movementId)];

        if (normalized.Contains("QUOTA JAUME 60 TOT 2022"))
        {
            var result = new List<EconomiaImputacio> { New("Quota", "Jaume", new DateOnly(2022, 2, 1), 20, clean, false, linked, movementId) };
            result.AddRange(Enumerable.Range(3, 10).Select(month => New("Quota", "Jaume", new DateOnly(2022, month, 1), 60, clean, false, linked, movementId)));
            return result;
        }
        var month = FindMonth(normalized) ?? (data.Month == 12 ? 1 : data.Month + 1); var year = data.Year + (month == 1 && data.Month == 12 ? 1 : 0);
        year = ExtractYear(normalized) ?? year;
        var people = KnownPeople().Where(p => normalized.Contains(RemoveAccents(p).ToUpperInvariant())).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (normalized.Contains("JOAN I ESTER") || normalized.Contains("ESTER I JOAN") || (normalized.Contains("JOAN") && normalized.Contains("ESTER"))) people = ["JoanD", "Ester"];
        if (people.Count == 0) { var match = QuotaPersonRegex().Match(clean); if (match.Success) people.Add(match.Groups[1].Value.Trim()); }
        if (people.Count == 0) return [New("Quota", null, new DateOnly(year, month, 1), import, clean, true, linked, movementId)];
        if (people.Count == 1 && import > 40 && import % 40 == 0 && FindMonth(normalized) != null)
        {
            var first = new DateOnly(year, month, 1);
            return Enumerable.Range(0, (int)(import / 40)).Select(offset => New("Quota", CanonicalPerson(people[0]), first.AddMonths(offset), 40, clean, false, linked, movementId)).ToList();
        }
        var split = people.Count > 1 ? import / people.Count : import;
        return people.Select(p => New("Quota", CanonicalPerson(p), new DateOnly(year, month, 1), split, clean, false, linked, movementId)).ToList();
    }

    private static EconomiaImputacio New(string cat, string? person, DateOnly? period, decimal amount, string desc, bool review, bool linked, int? id) => new() { EconomiaMovimentId = linked ? id : null, Categoria = cat, Persona = person, Periode = period, Import = amount, Descriptor = desc, RequereixRevisio = review, Origen = "Parser" };
    private static string CanonicalPerson(string p) => p.Equals("Joan", StringComparison.OrdinalIgnoreCase) ? "Joan" : p;
    private static IEnumerable<string> KnownPeople() => ["Albert", "Anna", "Arnau", "Estrella", "Gemma", "Gisela", "Jaume", "JoanD", "Ester", "Joan", "Laia", "Laura", "MariaJoan", "Maria", "Marta", "Miquel", "Nil", "Xumi", "Cor"];
    private static int? FindMonth(string s) { if (MojibakeMarchRegex().IsMatch(s)) return 3; for (var i = 0; i < Mesos.Length; i++) if (s.Contains(RemoveAccents(Mesos[i]).ToUpperInvariant())) return i + 1; return null; }
    private static int? ExtractYear(string value)
    {
        var fourDigits = FourDigitYearRegex().Match(value);
        if (fourDigits.Success) return int.Parse(fourDigits.Value);
        var brokenMarch = MojibakeMarchRegex().Match(value);
        if (brokenMarch.Success) return 2000 + int.Parse(brokenMarch.Groups[1].Value);
        var monthYear = MonthYearRegex().Match(value);
        return monthYear.Success ? 2000 + int.Parse(monthYear.Groups[1].Value) : null;
    }

    private async Task RepairHistoricalDataAsync()
    {
        var invalid = await db.EconomiaImputacions.Where(x => x.Periode != null && x.Periode.Value.Year >= 2050).ToListAsync();
        foreach (var group in invalid.GroupBy(x => new { x.Descriptor, x.EconomiaMovimentId }))
        {
            db.EconomiaImputacions.RemoveRange(group);
            db.EconomiaImputacions.AddRange(Classify(new DateOnly(2022, 11, 10), group.Sum(x => x.Import), group.Key.Descriptor, group.Key.EconomiaMovimentId != null, group.Key.EconomiaMovimentId));
        }
        var historicalQuotes = await db.EconomiaImputacions.Where(x => x.Categoria == "Quota" && x.Periode != null).ToListAsync();
        var brokenMarch = historicalQuotes.Where(x => MojibakeMarchRegex().IsMatch(x.Descriptor) && x.Periode!.Value.Month != 3).ToList();
        foreach (var group in brokenMarch.GroupBy(x => new { x.Descriptor, x.EconomiaMovimentId }))
        {
            db.EconomiaImputacions.RemoveRange(group);
            var sourceDate = group.First().Periode!.Value.AddMonths(-1);
            db.EconomiaImputacions.AddRange(Classify(sourceDate, group.Sum(x => x.Import), group.Key.Descriptor, group.Key.EconomiaMovimentId != null, group.Key.EconomiaMovimentId));
        }
        if (invalid.Count > 0 || brokenMarch.Count > 0) await db.SaveChangesAsync();
    }

    private async Task LinkHistoricalAllocationsAsync()
    {
        var unlinked = await db.EconomiaImputacions.Where(x => x.Categoria == "Quota" && x.EconomiaMovimentId == null).ToListAsync();
        if (unlinked.Count == 0) return;
        var sheetPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "economia-sheet.csv");
        if (!File.Exists(sheetPath)) return;
        var sourceRows = new List<(string Persona, DateOnly Periode, DateOnly Data)>();
        foreach (var row in ParseDelimited(await File.ReadAllTextAsync(sheetPath), ',').Skip(1).Where(r => r.Count >= 3))
        {
            if (!TryDate(row[0], out var data) || !TryMoney(row[1], out var amount)) continue;
            sourceRows.AddRange(Classify(data, amount, row[2].Trim(), false)
                .Where(x => x.Categoria == "Quota" && x.Persona != null && x.Periode != null)
                .Select(x => (x.Persona!, x.Periode!.Value, data)));
        }
        var movements = await db.EconomiaMoviments.Where(x => x.Import > 0).ToListAsync();
        foreach (var group in unlinked.GroupBy(x => new { x.Persona, x.Periode }))
        {
            var source = sourceRows.FirstOrDefault(x => x.Persona == group.Key.Persona && x.Periode == group.Key.Periode);
            if (source == default) continue;
            var sourceDate = source.Data;
            var people = group.Where(x => x.Persona != null).Select(x => x.Persona!).Distinct().ToList();
            var candidate = movements.Where(x => Math.Abs(x.Data.DayNumber - sourceDate.DayNumber) <= 7)
                .OrderBy(x => PersonScore(x.DescriptorOriginal, people))
                .ThenBy(x => Math.Abs(x.Data.DayNumber - sourceDate.DayNumber))
                .ThenBy(x => Math.Abs(x.Import - group.Sum(a => a.Import)))
                .FirstOrDefault();
            if (candidate is null || PersonScore(candidate.DescriptorOriginal, people) >= 100) continue;
            foreach (var allocation in group) allocation.EconomiaMovimentId = candidate.EconomiaMovimentId;
        }
        await db.SaveChangesAsync();
    }

    private async Task EnsureHistoricalGridAsync()
    {
        if (await db.EconomiaImputacions.AnyAsync(x => x.Origen == "GraellaSheet")) return;
        var sheetPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seed", "economia-sheet.csv");
        if (!File.Exists(sheetPath)) return;
        var rows = ParseDelimited(await File.ReadAllTextAsync(sheetPath), ',');
        var exact = new List<EconomiaImputacio>();
        for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
        {
            var header = rows[rowIndex];
            if (header.Count < 17 || !string.Equals(header[4].Trim(), "Quota", StringComparison.OrdinalIgnoreCase)) continue;
            var periods = header.Skip(5).Take(12).Select(ParseGridPeriod).ToList();
            for (var personIndex = rowIndex + 1; personIndex < rows.Count; personIndex++)
            {
                var personRow = rows[personIndex];
                var person = personRow.Count > 4 ? personRow[4].Trim() : string.Empty;
                if (string.IsNullOrWhiteSpace(person) || string.Equals(person, "Quota", StringComparison.OrdinalIgnoreCase)) break;
                for (var column = 0; column < 12; column++)
                {
                    if (periods[column] is not { } period || personRow.Count <= column + 5 || !TryMoney(personRow[column + 5], out var amount)) continue;
                    exact.Add(new EconomiaImputacio { Categoria = "Quota", Persona = person, Periode = period, Import = amount, Descriptor = $"Quota {Mesos[period.Month - 1]}{period.Year % 100:00} {person}", Origen = "GraellaSheet" });
                }
            }
        }
        if (exact.Count == 0) return;
        db.EconomiaImputacions.RemoveRange(await db.EconomiaImputacions.Where(x => x.Categoria == "Quota").ToListAsync());
        db.EconomiaImputacions.AddRange(exact);
        await db.SaveChangesAsync();
    }

    private static DateOnly? ParseGridPeriod(string value)
    {
        var normalized = RemoveAccents(value).ToUpperInvariant();
        var month = normalized.StartsWith("MAR", StringComparison.Ordinal) ? 3 : FindMonth(normalized); var year = Regex.Match(normalized, @"(\d{2})$");
        return month != null && year.Success ? new DateOnly(2000 + int.Parse(year.Groups[1].Value), month.Value, 1) : null;
    }

    private static int PersonScore(string descriptor, IReadOnlyCollection<string> people)
    {
        var value = RemoveAccents(descriptor).ToUpperInvariant();
        foreach (var person in people)
        {
            var aliases = person switch { "Xumi" => new[] { "JAUME GRAU ORTIZ", "XUMI" }, "Jaume" => new[] { "JAUME GRAU SORIGUERA", "SURI" }, "JoanD" or "Ester" => new[] { "JOAN DURAN", "ESTER" }, "Joan" => new[] { "JOAN ORTIZ" }, _ => new[] { RemoveAccents(person).ToUpperInvariant() } };
            if (aliases.Any(value.Contains)) return 0;
        }
        return 100;
    }
    private static string RemoveAccents(string s) => new(s.Normalize(NormalizationForm.FormD).Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark).ToArray());
    private static string Fingerprint(DateOnly d, DateOnly v, decimal amount, decimal balance, string original) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{d:yyyy-MM-dd}|{v:yyyy-MM-dd}|{amount:0.00}|{balance:0.00}|{Regex.Replace(original.Trim(), @"\s+", " ").ToUpperInvariant()}")));
    private static bool TryDate(string value, out DateOnly date) => DateOnly.TryParseExact(value.Trim(), ["dd/MM/yy", "dd/MM/yyyy"], Ca, DateTimeStyles.None, out date);
    private static bool TryMoney(string value, out decimal amount) => decimal.TryParse(value.Replace("€", "").Replace(" ", "").Trim(), NumberStyles.Number | NumberStyles.AllowLeadingSign, Ca, out amount);

    private static List<(DateOnly Data, DateOnly DataValor, string Original, decimal Import, decimal? Saldo)> ParseInput(string text)
    {
        var result = new List<(DateOnly, DateOnly, string, decimal, decimal?)>();
        foreach (var raw in text.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries))
        {
            var line = raw.Trim(); if (!char.IsDigit(line.FirstOrDefault())) continue;
            var cells = line.Contains('|') ? line.Trim('|').Split('|').Select(x => x.Trim()).ToList() : line.Split(';').Select(x => x.Trim()).ToList();
            if (cells.Count < 4 || !TryDate(cells[0], out var data) || !TryDate(cells[1], out var value)) continue;
            if (!TryMoney(cells[3].Replace("- ", "-"), out var amount)) continue;
            decimal? balance = cells.Count > 4 && TryMoney(Regex.Replace(cells[4], "<.*?>", ""), out var parsedBalance) ? parsedBalance : null;
            result.Add((data, value, cells[2], amount, balance));
        }
        return result;
    }

    private static List<List<string>> ParseDelimited(string text, char delimiter)
    {
        var rows = new List<List<string>>(); var row = new List<string>(); var field = new StringBuilder(); var quoted = false;
        for (var i = 0; i < text.Length; i++) { var c = text[i]; if (c == '"') { if (quoted && i + 1 < text.Length && text[i + 1] == '"') { field.Append('"'); i++; } else quoted = !quoted; } else if (c == delimiter && !quoted) { row.Add(field.ToString()); field.Clear(); } else if ((c == '\n' || c == '\r') && !quoted) { if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++; row.Add(field.ToString()); field.Clear(); if (row.Any(x => x.Length > 0)) rows.Add(row); row = []; } else field.Append(c); }
        if (field.Length > 0 || row.Count > 0) { row.Add(field.ToString()); rows.Add(row); } return rows;
    }

    [GeneratedRegex(@"\b20\d{2}\b")] private static partial Regex FourDigitYearRegex();
    [GeneratedRegex(@"(?:GENER|FEBRER|MARC|ABRIL|MAIG|JUNY|JULIOL|AGOST|SETEMBRE|OCTUBRE|NOVEMBRE|DESEMBRE)\s*(\d{2})(?!\d)")] private static partial Regex MonthYearRegex();
    [GeneratedRegex(@"(?i)^Quota\s+Mar.{1,10}?(\d{2})\s+")] private static partial Regex MojibakeMarchRegex();
    [GeneratedRegex(@"(?i)^Quota\s+\S+\s+(.+)$")] private static partial Regex QuotaPersonRegex();
}
