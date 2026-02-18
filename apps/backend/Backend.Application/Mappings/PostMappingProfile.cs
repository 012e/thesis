using AutoMapper;
using Backend.Application.DTOs;
using Backend.Domain.Entities;

namespace Backend.Application.Mappings;

public class PostMappingProfile : Profile
{
    public PostMappingProfile()
    {
        // Entity to DTO
        CreateMap<Post, PostResponse>();

        // DTO to Entity
        CreateMap<CreatePostRequest, Post>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore());

        // Update request mapping
        CreateMap<UpdatePostRequest, Post>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.AuthorId, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.Content, opt => opt.MapFrom(src => new PostContent { Text = src.Content.Text }));
    }
}

