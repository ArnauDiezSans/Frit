using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;
using Microsoft.EntityFrameworkCore;

namespace FritApi.Services;

public class UsuarioService
{
    private readonly AppDbContext _context;
    private readonly PasswordService _passwordService;

    public UsuarioService(AppDbContext context, PasswordService passwordService)
    {
        _context = context;
        _passwordService = passwordService;
    }

    public async Task<List<UsuarioDto>> GetAllAsync()
    {
        return await _context.Usuarios
            .OrderBy(u => u.Nombre)
            .Select(u => new UsuarioDto
            {
                UsuarioId = u.UsuarioId,
                Nombre = u.Nombre,
                Grupo = u.Grupo,
                Observaciones = u.Observaciones,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<UsuarioDto?> GetByIdAsync(int id)
    {
        return await _context.Usuarios
            .Where(u => u.UsuarioId == id)
            .Select(u => new UsuarioDto
            {
                UsuarioId = u.UsuarioId,
                Nombre = u.Nombre,
                Grupo = u.Grupo,
                Observaciones = u.Observaciones,
                CreatedAt = u.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<UsuarioDto> CreateAsync(UsuarioWriteDto dto)
    {
        var usuario = new Usuario
        {
            Nombre = dto.Nombre.Trim(),
            Grupo = string.IsNullOrWhiteSpace(dto.Grupo) ? null : dto.Grupo.Trim(),
            Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim(),
            PasswordHash = _passwordService.HashPassword(dto.Password)
        };

        _context.Usuarios.Add(usuario);
        await _context.SaveChangesAsync();

        return new UsuarioDto
        {
            UsuarioId = usuario.UsuarioId,
            Nombre = usuario.Nombre,
            Grupo = usuario.Grupo,
            Observaciones = usuario.Observaciones,
            CreatedAt = usuario.CreatedAt
        };
    }

    public async Task<UsuarioDto?> UpdateAsync(int id, UsuarioWriteDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == id);

        if (usuario is null)
        {
            return null;
        }

        usuario.Nombre = dto.Nombre.Trim();
        usuario.Grupo = string.IsNullOrWhiteSpace(dto.Grupo) ? null : dto.Grupo.Trim();
        usuario.Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim();
        usuario.PasswordHash = _passwordService.HashPassword(dto.Password);

        await _context.SaveChangesAsync();

        return new UsuarioDto
        {
            UsuarioId = usuario.UsuarioId,
            Nombre = usuario.Nombre,
            Grupo = usuario.Grupo,
            Observaciones = usuario.Observaciones,
            CreatedAt = usuario.CreatedAt
        };
    }

    public async Task<UsuarioDto?> UpdateProfileAsync(int id, UsuarioProfileUpdateDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == id);

        if (usuario is null)
        {
            return null;
        }

        usuario.Nombre = dto.Nombre.Trim();
        usuario.Grupo = string.IsNullOrWhiteSpace(dto.Grupo) ? null : dto.Grupo.Trim();
        usuario.Observaciones = string.IsNullOrWhiteSpace(dto.Observaciones) ? null : dto.Observaciones.Trim();

        await _context.SaveChangesAsync();

        return new UsuarioDto
        {
            UsuarioId = usuario.UsuarioId,
            Nombre = usuario.Nombre,
            Grupo = usuario.Grupo,
            Observaciones = usuario.Observaciones,
            CreatedAt = usuario.CreatedAt
        };
    }

    public async Task<bool?> ChangePasswordAsync(int id, ChangePasswordDto dto)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == id);

        if (usuario is null)
        {
            return null;
        }

        if (!_passwordService.VerifyPassword(usuario.PasswordHash, dto.OldPassword))
        {
            return false;
        }

        usuario.PasswordHash = _passwordService.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.UsuarioId == id);

        if (usuario is null)
        {
            return false;
        }

        _context.Usuarios.Remove(usuario);
        await _context.SaveChangesAsync();

        return true;
    }
}
