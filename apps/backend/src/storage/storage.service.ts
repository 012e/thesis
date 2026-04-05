import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { env } from '@/env';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor() {
    this.client = new S3Client({
      endpoint: `http${env.MINIO_USE_SSL ? 's' : ''}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
      region: 'us-east-1', // MinIO requires a region, but it's not used
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true, // Required for MinIO
    });
    this.bucket = env.MINIO_BUCKET;
    this.publicUrl = env.MINIO_PUBLIC_URL;
  }

  async onModuleInit() {
    await this.ensureBucket();
  }

  /**
   * Ensure the bucket exists, creating it if necessary with public read policy
   */
  async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket "${this.bucket}" already exists`);
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        (error.name === 'NotFound' || error.name === 'NoSuchBucket')
      ) {
        this.logger.log(`Creating bucket "${this.bucket}"...`);
        await this.client.send(
          new CreateBucketCommand({ Bucket: this.bucket }),
        );

        // Set public read policy for the bucket
        const policy = {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: '*',
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${this.bucket}/*`],
            },
          ],
        };

        await this.client.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucket,
            Policy: JSON.stringify(policy),
          }),
        );

        this.logger.log(
          `Bucket "${this.bucket}" created with public read policy`,
        );
      } else {
        this.logger.error('Failed to check/create bucket', error);
        // Do not crash the application in test environment if Minio is not available
        if (env.NODE_ENV !== 'test') {
          throw error;
        }
      }
    }
  }

  /**
   * Upload an image to the storage bucket
   * @param buffer - The image data
   * @param key - The storage key (path)
   * @param contentType - The MIME type
   * @returns The public URL of the uploaded image
   */
  async uploadImage(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return this.getPublicUrl(key);
  }

  /**
   * Delete an image from the storage bucket
   * @param key - The storage key (path)
   */
  async deleteImage(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /**
   * Delete multiple images from the storage bucket
   * @param keys - Array of storage keys
   */
  async deleteImages(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.deleteImage(key)));
  }

  /**
   * Get the public URL for an image
   * @param key - The storage key (path)
   * @returns The public URL
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${this.bucket}/${key}`;
  }
}
