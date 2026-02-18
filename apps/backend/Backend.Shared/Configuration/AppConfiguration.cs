using System.ComponentModel.DataAnnotations;

namespace Backend.Shared.Configuration;

/// <summary>
/// Application configuration settings with validation
/// </summary>
public class AppConfiguration
{
    public const string SectionName = "App";

    [Required(ErrorMessage = "Application name is required")]
    [MinLength(1, ErrorMessage = "Application name cannot be empty")]
    public string Name { get; set; } = "Backend API";

    [Required(ErrorMessage = "Environment is required")]
    public string Environment { get; set; } = "Development";

    [Range(1, 65535, ErrorMessage = "Port must be between 1 and 65535")]
    public int Port { get; set; } = 5000;

    [Url(ErrorMessage = "Invalid URL format for AllowedHosts")]
    public string AllowedHosts { get; set; } = "*";
}

