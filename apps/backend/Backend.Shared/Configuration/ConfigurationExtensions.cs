using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Backend.Shared.Configuration;

/// <summary>
/// Extension methods for configuration setup and validation
/// </summary>
public static class ConfigurationExtensions
{
    /// <summary>
    /// Adds and validates configuration settings
    /// </summary>
    /// <param name="services">The service collection</param>
    /// <param name="configuration">The configuration instance</param>
    /// <returns>The service collection for chaining</returns>
    public static IServiceCollection AddConfigurations(
        this IServiceCollection services)
    {
        // Configure and validate DatabaseConfiguration
        services.AddOptions<DatabaseConfiguration>(DatabaseConfiguration.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        // Configure and validate AppConfiguration
        services.AddOptions<AppConfiguration>(AppConfiguration.SectionName)
            .ValidateDataAnnotations()
            .ValidateOnStart();

        return services;
    }

    /// <summary>
    /// Gets a validated configuration instance
    /// </summary>
    /// <typeparam name="T">The configuration type</typeparam>
    /// <param name="configuration">The configuration instance</param>
    /// <param name="sectionName">The section name</param>
    /// <returns>The validated configuration</returns>
    public static T GetValidatedConfiguration<T>(
        this IConfiguration configuration,
        string sectionName) where T : new()
    {
        var config = new T();
        configuration.GetSection(sectionName).Bind(config);
        
        // Validate using DataAnnotations
        var validationResults = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        var validationContext = new System.ComponentModel.DataAnnotations.ValidationContext(config);
        
        if (!System.ComponentModel.DataAnnotations.Validator.TryValidateObject(
            config, validationContext, validationResults, true))
        {
            var errors = string.Join("; ", validationResults.Select(r => r.ErrorMessage));
            throw new InvalidOperationException(
                $"Configuration validation failed for {typeof(T).Name}: {errors}");
        }

        return config;
    }
}

