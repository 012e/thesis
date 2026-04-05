import {
  TestAppContext,
  createTestApp,
  closeTestApp,
} from '../helpers/app.setup';
import {
  PostgresContainerContext,
  startPostgresContainer,
  stopPostgresContainer,
} from '../helpers/testcontainers.setup';
import { runBetterAuthMigrations } from '../helpers/database.setup';
import { createE2ETestUser } from '../helpers/auth.helper';
import request from 'supertest';
import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

describe('Uploads (e2e)', () => {
  let dbContainer: PostgresContainerContext;
  let appCtx: TestAppContext;
  let uploaderUser: any;
  let authCookie: string;

  // Mock Storage Service
  const mockStorageService = {
    uploadImage: vi
      .fn()
      .mockImplementation(async (buffer, key, contentType) => {
        return `http://localhost:9000/test-bucket/${key}`;
      }),
    deleteImage: vi.fn().mockResolvedValue(undefined),
    deleteImages: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi
      .fn()
      .mockImplementation((key) => `http://localhost:9000/test-bucket/${key}`),
    ensureBucket: vi.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    dbContainer = await startPostgresContainer();
    // VERY IMPORTANT: Set env vars before any dynamic imports of app code!
    process.env.DATABASE_URL = dbContainer.databaseUrl;

    await runBetterAuthMigrations(dbContainer.databaseUrl);

    // Dynamically import to ensure env vars are used
    // @ts-ignore
    const { StorageService } = await import('@/storage/storage.service');

    appCtx = await createTestApp(dbContainer, (builder) => {
      return builder
        .overrideProvider(StorageService)
        .useValue(mockStorageService);
    });

    const result = await createE2ETestUser(
      appCtx.app,
      `uploader@example.com`,
      `uploader`,
    );
    uploaderUser = result.user;
    authCookie = result.cookie as string;
  }, 120000);

  afterAll(async () => {
    if (appCtx) {
      await closeTestApp(appCtx);
    }
    if (dbContainer) {
      await stopPostgresContainer(dbContainer);
    }
  });

  describe('POST /uploads/images', () => {
    it('should return 401 if not authenticated', async () => {
      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .attach('files', Buffer.from('test'), 'test.jpg');

      expect(response.status).toBe(401);
    });

    it('should return 400 if no files are uploaded', async () => {
      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .set('Cookie', authCookie);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('No files uploaded');
    });

    it('should upload and scale images successfully', async () => {
      // Create a test image
      const imageBuffer = await sharp({
        create: {
          width: 2000,
          height: 1000,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .jpeg()
        .toBuffer();

      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .set('Cookie', authCookie)
        .attach('files', imageBuffer, 'test-image.jpg');

      expect(response.status).toBe(201);

      const { images } = response.body;
      expect(images).toHaveLength(1);

      const uploadedImage = images[0];
      expect(uploadedImage).toHaveProperty('url');
      expect(uploadedImage).toHaveProperty('key');
      expect(uploadedImage.key).toContain('test-image.webp');

      // Check if image was resized properly (max dimension 1200)
      expect(uploadedImage.width).toBe(1200);
      expect(uploadedImage.height).toBe(600); // Because 2000x1000 scales down to 1200x600

      // Verify mock was called
      expect(mockStorageService.uploadImage).toHaveBeenCalledTimes(1);
    });

    it('should convert uploaded image to webp', async () => {
      // Create a test png image
      const imageBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .set('Cookie', authCookie)
        .attach('files', imageBuffer, 'test-png.png');

      expect(response.status).toBe(201);

      const { images } = response.body;
      expect(images).toHaveLength(1);

      const uploadedImage = images[0];
      expect(uploadedImage.key).toContain('test-png.webp');
      expect(uploadedImage.width).toBe(800);
      expect(uploadedImage.height).toBe(600);

      // Ensure the correct content type was sent to S3
      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(String),
        'image/webp',
      );
    });

    it('should accept up to 4 images at once', async () => {
      // Create a tiny test image
      const imageBuffer = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .set('Cookie', authCookie)
        .attach('files', imageBuffer, 'img1.png')
        .attach('files', imageBuffer, 'img2.png')
        .attach('files', imageBuffer, 'img3.png')
        .attach('files', imageBuffer, 'img4.png');

      expect(response.status).toBe(201);
      expect(response.body.images).toHaveLength(4);
    });

    it('should reject if more than 4 images are uploaded', async () => {
      // Create a tiny test image
      const imageBuffer = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .set('Cookie', authCookie)
        .attach('files', imageBuffer, 'img1.png')
        .attach('files', imageBuffer, 'img2.png')
        .attach('files', imageBuffer, 'img3.png')
        .attach('files', imageBuffer, 'img4.png')
        .attach('files', imageBuffer, 'img5.png');

      expect(response.status).toBe(400); // Multer TooManyFiles, or our custom 400
    });

    it('should reject invalid file types', async () => {
      const textBuffer = Buffer.from('this is not an image');

      const response = await request(appCtx.app.getHttpServer())
        .post('/uploads/images')
        .set('Cookie', authCookie)
        .attach('files', textBuffer, {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid file type');
    });
  });
});
