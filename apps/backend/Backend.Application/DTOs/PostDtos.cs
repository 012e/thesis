using Backend.Domain.Entities;

namespace Backend.Application.DTOs;

public record CreatePostRequest(
    string Title,
    PostContent Content,
    Guid AuthorId
);


public record UpdatePostRequestContent(
    string Text
);

public record UpdatePostRequest(
    string Title,
    UpdatePostRequestContent Content
);

public record PostResponse(
    Guid Id,
    string Title,
    PostContent Content,
    Guid AuthorId,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

