using AutoMapper;
using Backend.Application.DTOs;
using Backend.Application.Mappings;
using Backend.Application.Services;
using Backend.Domain.Entities;
using Backend.IntegrationTests.Fixtures;
using FluentAssertions;

namespace Backend.IntegrationTests.Services;

public class PostServiceIntegrationTests : IClassFixture<DatabaseFixture>
{
    private readonly DatabaseFixture _fixture;
    private readonly IMapper _mapper;

    public PostServiceIntegrationTests(DatabaseFixture fixture)
    {
        _fixture = fixture;

        var config = new MapperConfiguration(cfg =>
        {
            cfg.AddProfile<PostMappingProfile>();
        });
        _mapper = config.CreateMapper();
    }

    [Fact]
    public async Task CreateAsync_ShouldCreatePost_AndReturnPostResponse()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);
        var request = new CreatePostRequest(
            Title: "Test Post",
            Content: new PostContent { Text = "This is a test post content" },
            AuthorId: Guid.NewGuid()
        );

        // Act
        var result = await service.CreateAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Id.Should().NotBeEmpty();
        result.Title.Should().Be(request.Title);
        result.Content.Text.Should().Be(request.Content.Text);
        result.AuthorId.Should().Be(request.AuthorId);
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

        // Verify in database
        var postInDb = await context.Posts.FindAsync(result.Id);
        postInDb.Should().NotBeNull();
        postInDb!.Title.Should().Be(request.Title);
        postInDb.Content.Text.Should().Be(request.Content.Text);
    }

    [Fact]
    public async Task GetByIdAsync_WhenPostExists_ShouldReturnPost()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);

        var post = new Post
        {
            Id = Guid.NewGuid(),
            Title = "Existing Post",
            Content = new PostContent { Text = "Existing content" },
            AuthorId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Posts.Add(post);
        await context.SaveChangesAsync();

        // Act
        var result = await service.GetByIdAsync(post.Id);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(post.Id);
        result.Title.Should().Be(post.Title);
        result.Content.Text.Should().Be(post.Content.Text);
        result.AuthorId.Should().Be(post.AuthorId);
    }

    [Fact]
    public async Task GetByIdAsync_WhenPostDoesNotExist_ShouldReturnNull()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await service.GetByIdAsync(nonExistentId);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAllAsync_ShouldReturnAllPosts_OrderedByCreatedAtDescending()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);

        var post1 = new Post
        {
            Id = Guid.NewGuid(),
            Title = "First Post",
            Content = new PostContent { Text = "First content" },
            AuthorId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            UpdatedAt = DateTime.UtcNow.AddHours(-2)
        };

        var post2 = new Post
        {
            Id = Guid.NewGuid(),
            Title = "Second Post",
            Content = new PostContent { Text = "Second content" },
            AuthorId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddHours(-1)
        };

        var post3 = new Post
        {
            Id = Guid.NewGuid(),
            Title = "Third Post",
            Content = new PostContent { Text = "Third content" },
            AuthorId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.Posts.AddRange(post1, post2, post3);
        await context.SaveChangesAsync();

        // Act
        var results = (await service.GetAllAsync()).ToList();

        // Assert
        results.Should().HaveCount(3);
        results[0].Id.Should().Be(post3.Id); // Most recent first
        results[1].Id.Should().Be(post2.Id);
        results[2].Id.Should().Be(post1.Id); // Oldest last
    }

    [Fact]
    public async Task UpdateAsync_WhenPostExists_ShouldUpdatePost()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);

        var post = new Post
        {
            Id = Guid.NewGuid(),
            Title = "Original Title",
            Content = new PostContent { Text = "Original content" },
            AuthorId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            UpdatedAt = DateTime.UtcNow.AddHours(-1)
        };
        context.Posts.Add(post);
        await context.SaveChangesAsync();

        var updateRequest = new UpdatePostRequest(
            Title: "Updated Title",
            Content: new UpdatePostRequestContent(Text: "Updated content")
        );

        // Act
        var result = await service.UpdateAsync(post.Id, updateRequest);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(post.Id);
        result.Title.Should().Be("Updated Title");
        result.Content.Text.Should().Be("Updated content");
        result.AuthorId.Should().Be(post.AuthorId); // Should remain unchanged
        result.CreatedAt.Should().Be(post.CreatedAt); // Should remain unchanged
        result.UpdatedAt.Should().BeOnOrAfter(post.UpdatedAt);

        // Verify in database
        await context.Entry(post).ReloadAsync();
        post.Title.Should().Be("Updated Title");
        post.Content.Text.Should().Be("Updated content");
    }

    [Fact]
    public async Task UpdateAsync_WhenPostDoesNotExist_ShouldReturnNull()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);
        var nonExistentId = Guid.NewGuid();

        var updateRequest = new UpdatePostRequest(
            Title: "Updated Title",
            Content: new UpdatePostRequestContent(Text: "Updated content")
        );

        // Act
        var result = await service.UpdateAsync(nonExistentId, updateRequest);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenPostExists_ShouldDeletePost_AndReturnTrue()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);

        var post = new Post
        {
            Id = Guid.NewGuid(),
            Title = "Post to Delete",
            Content = new PostContent { Text = "Content to delete" },
            AuthorId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.Posts.Add(post);
        await context.SaveChangesAsync();

        // Act
        var result = await service.DeleteAsync(post.Id);

        // Assert
        result.Should().BeTrue();

        // Verify in database
        var postInDb = await context.Posts.FindAsync(post.Id);
        postInDb.Should().BeNull();
    }

    [Fact]
    public async Task DeleteAsync_WhenPostDoesNotExist_ShouldReturnFalse()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await service.DeleteAsync(nonExistentId);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CreateAsync_WithMultiplePosts_ShouldMaintainDataIntegrity()
    {
        // Arrange
        await using var context = _fixture.CreateDbContext();
        var service = new PostService(context, _mapper);
        var authorId = Guid.NewGuid();

        // Act
        var post1 = await service.CreateAsync(new CreatePostRequest(
            Title: "Post 1",
            Content: new PostContent { Text = "Content 1" },
            AuthorId: authorId
        ));

        var post2 = await service.CreateAsync(new CreatePostRequest(
            Title: "Post 2",
            Content: new PostContent { Text = "Content 2" },
            AuthorId: authorId
        ));

        // Assert
        post1.Id.Should().NotBe(post2.Id);
        post1.AuthorId.Should().Be(post2.AuthorId);

        var allPosts = (await service.GetAllAsync()).ToList();
        allPosts.Should().HaveCountGreaterOrEqualTo(2);
        allPosts.Should().Contain(p => p.Id == post1.Id);
        allPosts.Should().Contain(p => p.Id == post2.Id);
    }
}

