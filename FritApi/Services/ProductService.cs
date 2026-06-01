using Microsoft.EntityFrameworkCore;
using FritApi.Data;
using FritApi.Dtos;
using FritApi.Models;

namespace FritApi.Services;

public sealed class ProductService
{
    private readonly AppDbContext _db;

    public ProductService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Product>> GetAllAsync()
    {
        return await _db.Products
            .OrderByDescending(product => product.CreatedAt)
            .ToListAsync();
    }

    public async Task<Product?> GetByIdAsync(int id)
    {
        return await _db.Products.FindAsync(id);
    }

    public async Task<Product> CreateAsync(ProductCreateDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();
        return product;
    }

    public async Task<bool> UpdateAsync(int id, ProductUpdateDto dto)
    {
        var existing = await _db.Products.FindAsync(id);
        if (existing is null)
        {
            return false;
        }

        existing.Name = dto.Name;
        existing.Description = dto.Description;
        existing.Price = dto.Price;

        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var existing = await _db.Products.FindAsync(id);
        if (existing is null)
        {
            return false;
        }

        _db.Products.Remove(existing);
        await _db.SaveChangesAsync();
        return true;
    }
}
