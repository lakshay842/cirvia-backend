import { s3StorageProvider, type UploadResult } from '../../providers/storage/s3.provider.js';

export class S3Uploader {
  async uploadPublic(
    folder: string,
    fileName: string,
    buffer: Buffer,
    mime: string,
  ): Promise<UploadResult> {
    return s3StorageProvider.uploadFile(folder, fileName, buffer, mime);
  }

  async uploadPrivate(
    folder: string,
    fileName: string,
    buffer: Buffer,
    mime: string,
  ): Promise<{ key: string; size: number; mime: string }> {
    return s3StorageProvider.uploadPrivateFile(folder, fileName, buffer, mime);
  }

  async delete(key: string): Promise<void> {
    return s3StorageProvider.deleteFile(key);
  }
}

export const s3Uploader = new S3Uploader();
