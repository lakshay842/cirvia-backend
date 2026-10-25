import { describe, it, expect } from 'vitest';
import { FileTypeValidator } from '../../src/shared/upload/file-type.validator.js';
import { UploadFactory } from '../../src/shared/upload/upload.factory.js';
import { ImageValidator } from '../../src/shared/upload/image.validator.js';

describe('FileTypeValidator', () => {
  it('accepts allowed mime types', () => {
    const v = new FileTypeValidator(['image/jpeg', 'image/png']);
    expect(() => v.validate('image/jpeg')).not.toThrow();
  });

  it('rejects disallowed mime types', () => {
    const v = new FileTypeValidator(['image/jpeg']);
    expect(() => v.validate('application/pdf')).toThrow('Invalid file type');
  });
});

describe('UploadFactory', () => {
  it('creates single field upload middleware', () => {
    const handler = UploadFactory.single({
      fieldName: 'avatar',
      allowedMimes: ['image/jpeg'],
      maxBytes: 1024 * 1024,
    });
    expect(typeof handler).toBe('function');
  });

  it('creates multi-field upload middleware', () => {
    const handler = UploadFactory.fields({
      allowedMimes: ['image/jpeg'],
      maxBytes: 1024 * 1024,
      fields: [{ name: 'image', maxCount: 1 }],
    });
    expect(typeof handler).toBe('function');
  });
});

describe('ImageValidator', () => {
  it('validates minimum PNG dimensions', () => {
    const validator = new ImageValidator();
    const png = Buffer.alloc(100);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    png.writeUInt32BE(100, 16);
    png.writeUInt32BE(100, 20);
    expect(() => validator.validateBuffer(png, { minWidth: 50, minHeight: 50 })).not.toThrow();
  });
});
