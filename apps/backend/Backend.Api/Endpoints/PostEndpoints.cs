using Backend.Application.DTOs;
using Backend.Application.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Api.Endpoints;

public static class PostEndpoints
{
    public static void MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/posts")
            .WithTags("Posts")
            .WithOpenApi();

        group.MapGet("/", async (IPostService postService, CancellationToken cancellationToken) =>
        {
            var posts = await postService.GetAllAsync(cancellationToken);
            return Results.Ok(posts);
        })
        .WithName("GetAllPosts")
        .Produces<IEnumerable<PostResponse>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", async (Guid id, IPostService postService, CancellationToken cancellationToken) =>
        {
            var post = await postService.GetByIdAsync(id, cancellationToken);
            return post == null ? Results.NotFound() : Results.Ok(post);
        })
        .WithName("GetPostById")
        .Produces<PostResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/", async ([FromBody] CreatePostRequest request, IPostService postService, CancellationToken cancellationToken) =>
        {
            var post = await postService.CreateAsync(request, cancellationToken);
            return Results.CreatedAtRoute("GetPostById", new { id = post.Id }, post);
        })
        .WithName("CreatePost")
        .Produces<PostResponse>(StatusCodes.Status201Created);

        group.MapPut("/{id:guid}", async (Guid id, [FromBody] UpdatePostRequest request, IPostService postService, CancellationToken cancellationToken) =>
        {
            var post = await postService.UpdateAsync(id, request, cancellationToken);
            return post == null ? Results.NotFound() : Results.Ok(post);
        })
        .WithName("UpdatePost")
        .Produces<PostResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", async (Guid id, IPostService postService, CancellationToken cancellationToken) =>
        {
            var deleted = await postService.DeleteAsync(id, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        })
        .WithName("DeletePost")
        .Produces(StatusCodes.Status204NoContent)
        .Produces(StatusCodes.Status404NotFound);
    }
}


