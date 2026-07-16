using System.Reflection;
using FritApi.Controllers;
using Microsoft.AspNetCore.Authorization;

namespace FritApi.Tests;

public class AuthorizationTests
{
    [Theory]
    [InlineData(typeof(UsuariosController))]
    [InlineData(typeof(JuegosController))]
    [InlineData(typeof(PartidasController))]
    [InlineData(typeof(PartidaJugadoresController))]
    public void DataControllers_RequireAuthentication(Type controllerType)
    {
        Assert.NotNull(controllerType.GetCustomAttribute<AuthorizeAttribute>());
    }

    [Theory]
    [InlineData(typeof(UsuariosController), "Create")]
    [InlineData(typeof(UsuariosController), "Update")]
    [InlineData(typeof(UsuariosController), "Delete")]
    [InlineData(typeof(PartidasController), "Update")]
    [InlineData(typeof(PartidasController), "Delete")]
    [InlineData(typeof(PartidaJugadoresController), "Update")]
    [InlineData(typeof(PartidaJugadoresController), "Delete")]
    [InlineData(typeof(AQueJuguemController), "UpdateRemada")]
    [InlineData(typeof(AQueJuguemController), "DeleteRemada")]
    [InlineData(typeof(HallOfFameController), "CreateManualMedal")]
    public void AdministrativeEndpoints_RequireAdminRole(Type controllerType, string methodName)
    {
        var method = controllerType.GetMethod(methodName);
        var authorize = Assert.Single(method!.GetCustomAttributes<AuthorizeAttribute>());

        Assert.Equal("Admin", authorize.Roles);
    }
}
