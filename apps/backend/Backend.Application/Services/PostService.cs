using AutoMapper;
using Backend.Application.DTOs;
using Backend.Domain.Entities;
using Backend.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Backend.Application.Services;

public class PostService : IPostService
{
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public PostService(ApplicationDbContext context, IMapper mapper)
    {
        _context = context;
        _mapper = mapper;
    }

    public async Task<PostResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var post = await _context.Posts
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id, cancellationToken);

        return post == null ? null : _mapper.Map<PostResponse>(post);
    }

    public async Task<IEnumerable<PostResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var posts = await _context.Posts
            .AsNoTracking()
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return _mapper.Map<IEnumerable<PostResponse>>(posts);
    }

    public async Task<PostResponse> CreateAsync(CreatePostRequest request, CancellationToken cancellationToken = default)
    {
        var post = _mapper.Map<Post>(request);
        post.Id = Guid.NewGuid();
        post.CreatedAt = DateTime.UtcNow;
        post.UpdatedAt = DateTime.UtcNow;

        _context.Posts.Add(post);
        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<PostResponse>(post);
    }

    public async Task<PostResponse?> UpdateAsync(Guid id, UpdatePostRequest request, CancellationToken cancellationToken = default)
    {
        var post = await _context.Posts.FindAsync([id], cancellationToken);
        if (post == null)
        {
            return null;
        }

        _mapper.Map(request, post);
        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return _mapper.Map<PostResponse>(post);
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
}

