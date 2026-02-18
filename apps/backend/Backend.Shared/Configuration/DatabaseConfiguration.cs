using System.ComponentModel.DataAnnotations;

namespace Backend.Shared.Configuration;

/// <summary>
/// Database configuration settings with validation
/// </summary>
public class DatabaseConfiguration
{
    public const string SectionName = "ConnectionStrings";

    [Required(ErrorMessage = "DefaultConnection is required")]
    [MinLength(10, ErrorMessage = "Connection string must be at least 10 characters")]
    public string DefaultConnection { get; set; } = string.Empty;
}

