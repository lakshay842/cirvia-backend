import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getConfig } from '@config/index.js';
import { InternalServerError } from '@errors/index.js';
import { getLogger } from '@logger/index.js';

const logger = getLogger();

function assertS3ConfiguredForProduction(): void {
  const config = getConfig();
  if (config.NODE_ENV === 'production' && !config.AWS_BUCKET) {
    throw new InternalServerError('Object storage is not configured.');
  }
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mime: string;
}

export class S3StorageProvider {
  private client: S3Client | null = null;

  private isConfigured(): boolean {
    const config = getConfig();
    return Boolean(config.AWS_ACCESS_KEY && config.AWS_SECRET_KEY && config.AWS_BUCKET);
  }

  private getClient(): S3Client {
    if (!this.client) {
      const config = getConfig();
      this.client = new S3Client({
        region: config.AWS_REGION,
        credentials: {
          accessKeyId: config.AWS_ACCESS_KEY!,
          secretAccessKey: config.AWS_SECRET_KEY!,
        },
      });
    }
    return this.client;
  }

  async uploadPrivateFile(
    folder: string,
    fileName: string,
    buffer: Buffer,
    mime: string,
  ): Promise<{ key: string; size: number; mime: string }> {
    const config = getConfig();
    const key = `${folder}/${fileName}`;

    if (!this.isConfigured()) {
      assertS3ConfiguredForProduction();
      logger.warn({ key }, 'S3 not configured — storing key only in dev mode');
      return { key, size: buffer.length, mime };
    }

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: config.AWS_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mime,
        ServerSideEncryption: 'AES256',
      }),
    );

    return { key, size: buffer.length, mime };
  }

  extractKeyFromStoredValue(stored: string): string {
    if (!stored.startsWith('http')) return stored;
    const parts = stored.split('.amazonaws.com/');
    return parts[1] ?? stored;
  }

  async uploadFile(
    folder: string,
    fileName: string,
    buffer: Buffer,
    mime: string,
  ): Promise<UploadResult> {
    const config = getConfig();
    const key = `${folder}/${fileName}`;

    if (!this.isConfigured()) {
      assertS3ConfiguredForProduction();
      const url = `https://local-storage.cirvia.dev/${key}`;
      logger.warn({ key }, 'S3 not configured — using local placeholder URL');
      return { key, url, size: buffer.length, mime };
    }

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: config.AWS_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mime,
        ServerSideEncryption: 'AES256',
      }),
    );

    const url = `https://${config.AWS_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
    return { key, url, size: buffer.length, mime };
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const config = getConfig();

    if (!this.isConfigured()) {
      assertS3ConfiguredForProduction();
      return `https://local-storage.cirvia.dev/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: config.AWS_BUCKET!,
      Key: key,
    });

    return getSignedUrl(this.getClient(), command, { expiresIn: expiresInSeconds });
  }

  async deleteFile(key: string): Promise<void> {
    const config = getConfig();
    if (!this.isConfigured()) {
      return;
    }

    try {
      await this.getClient().send(
        new DeleteObjectCommand({
          Bucket: config.AWS_BUCKET!,
          Key: key,
        }),
      );
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete S3 object');
      throw new InternalServerError('Failed to delete file.');
    }
  }
}

export const s3StorageProvider = new S3StorageProvider();
