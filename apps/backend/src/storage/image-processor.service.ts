import { BadRequestException, Injectable } from "@nestjs/common";
import sharp from "sharp";

export interface ProcessedImage {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
}

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DIMENSION = 1200; // Max width or height

@Injectable()
export class ImageProcessorService {
  /**
   * Validate and process an image
   * - Validates file type and size
   * - Resizes to max 1200px dimension (maintaining aspect ratio)
   * - Converts to WebP format for optimal size
   */
  async processImage(
    buffer: Buffer,
    mimeType: string,
  ): Promise<ProcessedImage> {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
      );
    }

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB`,
      );
    }

    // Get image metadata
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException("Invalid image: could not read dimensions");
    }

    // Determine if resizing is needed
    const needsResize =
      metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION;

    // Process the image
    let processor = sharp(buffer);

    if (needsResize) {
      processor = processor.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to WebP for optimal file size
    const processedBuffer = await processor.webp({ quality: 85 }).toBuffer();

    // Get final dimensions
    const finalMetadata = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      contentType: "image/webp",
      width: finalMetadata.width ?? metadata.width,
      height: finalMetadata.height ?? metadata.height,
    };
  }

  /**
   * Generate a unique storage key for an image
   */
  generateKey(userId: string, filename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const sanitizedFilename = filename
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/\.[^.]+$/, ".webp"); // Replace extension with .webp
    return `posts/${userId}/${timestamp}-${random}-${sanitizedFilename}`;
  }
}
