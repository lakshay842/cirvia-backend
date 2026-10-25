import { s3StorageProvider } from '../../providers/storage/s3.provider.js';

export class SignedUrlService {
  async getSignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    return s3StorageProvider.getSignedUrl(key, expiresInSeconds);
  }

  extractKey(stored: string): string {
    return s3StorageProvider.extractKeyFromStoredValue(stored);
  }
}

export const signedUrlService = new SignedUrlService();
