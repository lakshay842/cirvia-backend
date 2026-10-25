import { ValidationError } from '@errors/index.js';
import { getImageDimensions } from '../../utils/image-dimension.util.js';

export interface ImageValidationOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export class ImageValidator {
  validateBuffer(buffer: Buffer, options: ImageValidationOptions = {}): void {
    const dimensions = getImageDimensions(buffer);
    if (!dimensions) {
      throw new ValidationError('Unable to read image dimensions.');
    }

    const minWidth = options.minWidth ?? 0;
    const minHeight = options.minHeight ?? 0;
    const maxWidth = options.maxWidth ?? 10_000;
    const maxHeight = options.maxHeight ?? 10_000;

    if (dimensions.width < minWidth || dimensions.height < minHeight) {
      throw new ValidationError(
        `Image too small. Minimum ${minWidth}x${minHeight}px required.`,
      );
    }
    if (dimensions.width > maxWidth || dimensions.height > maxHeight) {
      throw new ValidationError(
        `Image too large. Maximum ${maxWidth}x${maxHeight}px allowed.`,
      );
    }
  }
}

export const imageValidator = new ImageValidator();
