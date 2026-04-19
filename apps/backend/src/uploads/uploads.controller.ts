import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
} from "@nestjs/common";
import { FilesInterceptor } from "@nestjs/platform-express";
import type { UserSession } from "@thallesp/nestjs-better-auth";
import { Session } from "@thallesp/nestjs-better-auth";

import { ImageProcessorService } from "@/storage/image-processor.service";
import { StorageService } from "@/storage/storage.service";

const MAX_FILES = 4;

export interface UploadedImage {
  url: string;
  key: string;
  width: number;
  height: number;
}

export interface UploadImagesResponse {
  images: UploadedImage[];
}

@Controller("uploads")
export class UploadsController {
  constructor(
    private readonly storageService: StorageService,
    private readonly imageProcessorService: ImageProcessorService,
  ) {}

  @Post("images")
  @UseInterceptors(
    FilesInterceptor("files", MAX_FILES, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  )
  async uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Session() session: UserSession,
  ): Promise<UploadImagesResponse> {
    if (!files || files.length === 0) {
      throw new BadRequestException("No files uploaded");
    }

    if (files.length > MAX_FILES) {
      throw new BadRequestException(`Maximum ${MAX_FILES} files allowed`);
    }

    const uploadedImages: UploadedImage[] = [];

    for (const file of files) {
      // Process the image (validate, resize, convert to WebP)
      const processed = await this.imageProcessorService.processImage(
        file.buffer,
        file.mimetype,
      );

      // Generate a unique storage key
      const key = this.imageProcessorService.generateKey(
        session.user.id,
        file.originalname,
      );

      // Upload to MinIO
      const url = await this.storageService.uploadImage(
        processed.buffer,
        key,
        processed.contentType,
      );

      uploadedImages.push({
        url,
        key,
        width: processed.width,
        height: processed.height,
      });
    }

    return { images: uploadedImages };
  }
}
