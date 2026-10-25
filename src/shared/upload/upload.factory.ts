import multer from 'multer';
import { FileTypeValidator } from './file-type.validator.js';

export interface UploadFactoryOptions {
  allowedMimes: readonly string[];
  maxBytes: number;
  invalidTypeMessage?: string;
}

export class UploadFactory {
  static create(options: UploadFactoryOptions): multer.Multer {
    const validator = new FileTypeValidator(options.allowedMimes);
    return multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: options.maxBytes },
      fileFilter: validator.createMulterFilter(options.invalidTypeMessage),
    });
  }

  static single(
    options: UploadFactoryOptions & { fieldName: string },
  ): ReturnType<multer.Multer['single']> {
    return UploadFactory.create(options).single(options.fieldName);
  }

  static fields(
    options: UploadFactoryOptions & { fields: multer.Field[] },
  ): ReturnType<multer.Multer['fields']> {
    return UploadFactory.create(options).fields(options.fields);
  }
}
