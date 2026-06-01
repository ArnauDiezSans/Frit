using Microsoft.AspNetCore.Identity;

namespace FritApi.Services;

public class PasswordService
{
    private readonly PasswordHasher<object> _hasher = new();

    public string HashPassword(string plainPassword)
    {
        return _hasher.HashPassword(new object(), plainPassword);
    }

    public bool VerifyPassword(string hash, string plainPassword)
    {
        var result = _hasher.VerifyHashedPassword(new object(), hash, plainPassword);
        return result == PasswordVerificationResult.Success ||
               result == PasswordVerificationResult.SuccessRehashNeeded;
    }
}