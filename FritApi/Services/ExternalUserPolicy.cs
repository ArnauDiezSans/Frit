using FritApi.Models;

namespace FritApi.Services;

public static class ExternalUserPolicy
{
    public const string ExternalUserName = "Extern";

    public static bool IsExternal(Usuario usuario)
    {
        return usuario.EsUsuarioExterno;
    }
}
