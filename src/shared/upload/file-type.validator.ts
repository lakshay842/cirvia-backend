import { ValidationError } from '@errors/index.js';

export class FileTypeValidator {
  constructor(private readonly allowedMimes: readonly string[]) {}

  validate(mimetype: string, message?: string): void {
    if (!this.allowedMimes.includes(mimetype)) {
      throw new ValidationError(
        message ?? `Invalid file type. Allowed: ${this.allowedMimes.join(', ')}.`,
      );
    }
  }

  createMulterFilter(message?: string) {
    return (
      _req: unknown,
      file: { mimetype: string },
      cb: (error: Error | null, accept?: boolean) => void,
    ): void => {
      try {
        this.validate(file.mimetype, message);
        cb(null, true);
      } catch (error) {
        cb(error as Error);
      }
    };
  }
}
