export interface UserDto {
  id: string;
  username: string;
  email: string;
}

export interface PollPostOptionDto {
  id: string;
  label: string;
}

export interface PollPostContentDto {
  question: string;
  options: PollPostOptionDto[];
  allowsMultipleSelections: boolean;
  closesAt?: string | null;
}

export type VisualizationTypeDto = "bar" | "line" | "pie" | "table";

export interface VisualizationDataPointDto {
  label: string;
  value: number;
}

export interface VisualizationPostContentDto {
  title: string;
  visualizationType: VisualizationTypeDto;
  data: VisualizationDataPointDto[];
  description?: string;
  unit?: string;
}

export interface PostContentDto {
  text?: string;
  poll?: PollPostContentDto;
  visualization?: VisualizationPostContentDto;
}

export interface PostAuthorDto {
  id: string;
  username: string | null;
  email: string;
  name: string | null;
}

export interface PostDto {
  id: string;
  authorId: string;
  author: PostAuthorDto;
  content: PostContentDto;
  createdAt: string;
  updatedAt: string;
}
