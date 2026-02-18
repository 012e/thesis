namespace Backend.Application.DTOs;

public record CreatePostRequest(
    string Title,
    string Content,
    Guid AuthorId
);

public record UpdatePostRequest(
    string Title,
    string Content
);

public record PostResponse(
    Guid Id,
    string Title,
    string Content,
    Guid AuthorId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

