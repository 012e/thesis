using Backend.Application.DTOs;

namespace Backend.Application.Services;

public interface IPostService
{
    Task<PostResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IEnumerable<PostResponse>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<PostResponse> CreateAsync(CreatePostRequest request, CancellationToken cancellationToken = default);
    Task<PostResponse?> UpdateAsync(Guid id, UpdatePostRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

