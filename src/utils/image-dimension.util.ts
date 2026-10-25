import { ValidationError } from '@errors/index.js';

export interface ImageDimensions {
  width: number;
  height: number;
}

export function getImageDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24) return null;

  // PNG signature
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // JPEG — scan for SOF0/SOF2 marker
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      if (marker === undefined) break;
      const length = buffer.readUInt16BE(offset + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      offset += 2 + length;
    }
  }

  // WebP — RIFF header
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3fff;
      const height = buffer.readUInt16LE(28) & 0x3fff;
      return { width, height };
    }
  }

  return null;
}

export function validateImageDimensions(
  buffer: Buffer,
  limits: { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number },
): void {
  const dimensions = getImageDimensions(buffer);
  if (!dimensions) {
    throw new ValidationError('Unable to read image dimensions.');
  }
  if (dimensions.width < limits.minWidth || dimensions.height < limits.minHeight) {
    throw new ValidationError(
      `Image too small. Minimum ${limits.minWidth}x${limits.minHeight}px required.`,
    );
  }
  if (dimensions.width > limits.maxWidth || dimensions.height > limits.maxHeight) {
    throw new ValidationError(
      `Image too large. Maximum ${limits.maxWidth}x${limits.maxHeight}px allowed.`,
    );
  }
}
