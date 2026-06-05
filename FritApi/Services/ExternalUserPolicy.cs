using FritApi.Models;

namespace FritApi.Services;

public static class ExternalUserPolicy
{
    public const int ExternalUserId = 16;
    public const string ExternalUserName = "Extern";

    public static bool IsExternal(Usuario usuario)
    {
        return usuario.UsuarioId == ExternalUserId ||
            string.Equals(usuario.Nombre, ExternalUserName, StringComparison.OrdinalIgnoreCase);
    }
}
