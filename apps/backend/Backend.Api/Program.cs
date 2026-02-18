using Backend.Api.Endpoints;
using Backend.Application.Services;
using Backend.Infrastructure.Data;
using Backend.Shared.Configuration;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add and validate configuration on startup
builder.Services.AddConfigurations();

// Add services to the container.
builder.Services.AddOpenApi();


// Configure PostgreSQL with EF Core using validated configuration
var dbConfig = builder.Configuration.GetValidatedConfiguration<DatabaseConfiguration>(
    DatabaseConfiguration.SectionName);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(dbConfig.DefaultConnection));

// Register application services
builder.Services.AddScoped<IPostService, PostService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Map endpoints
app.MapPostEndpoints();

app.Run();

