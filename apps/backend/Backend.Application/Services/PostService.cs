using Backend.Application.DTOs;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Application.Services;

public class PostService : IPostService
{
    private readonly ApplicationDbContext _context;

    public PostService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PostResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var post = await _context.Posts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        return post == null ? null : MapToResponse(post);
    }

    public async Task<IEnumerable<PostResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var posts = await _context.Posts
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return posts.Select(MapToResponse);
    }

    public async Task<PostResponse> CreateAsync(CreatePostRequest request, CancellationToken cancellationToken = default)
    {
        var post = new Post
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Content = request.Content,
            AuthorId = request.AuthorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Posts.Add(post);
        await _context.SaveChangesAsync(cancellationToken);

        return MapToResponse(post);
    }

    public async Task<PostResponse?> UpdateAsync(Guid id, UpdatePostRequest request, CancellationToken cancellationToken = default)
    {
        var post = await _context.Posts.FindAsync([id], cancellationToken);
        if (post == null)
        {
            return null;
        }

        post.Title = request.Title;
        post.Content = request.Content;
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return MapToResponse(post);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var post = await _context.Posts.FindAsync([id], cancellationToken);
        if (post == null)
        {
            return false;
        }

        _context.Posts.Remove(post);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    private static PostResponse MapToResponse(Post post)
    {
        return new PostResponse(
            post.Id,
            post.Title,
            post.Content,
            post.AuthorId,
            post.CreatedAt,
            post.UpdatedAt
        );
    }
}

