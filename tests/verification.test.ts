import { describe, it, expect } from 'vitest';
import {
  submitVerificationSchema,
  resubmitVerificationSchema,
  rejectVerificationSchema,
  requestReuploadSchema,
  internalNoteSchema,
  verificationIdParamSchema,
} from '../src/modules/verification/schemas/verification.schema.js';
import { getImageDimensions, validateImageDimensions } from '../src/utils/image-dimension.util.js';
import { encryptSensitive, decryptSensitive } from '../src/utils/encryption.util.js';
import { ValidationError } from '../src/errors/index.js';
import { VERIFICATION_CONSTANTS } from '../src/modules/verification/constants/verification.constants.js';
import {
  HyperVergeProvider,
  ManualVerificationProvider,
} from '../src/modules/verification/providers/verification-provider.registry.js';

describe('Verification schemas', () => {
  it('accepts valid submit payload', () => {
    const result = submitVerificationSchema.safeParse({ verificationType: 'AADHAAR' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown submit fields', () => {
    const result = submitVerificationSchema.safeParse({
      verificationType: 'PASSPORT',
      extra: true,
    });
    expect(result.success).toBe(false);
  });

  it('validates all document types', () => {
    for (const type of ['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'PAN_CARD', 'INTERNATIONAL_ID']) {
      expect(submitVerificationSchema.safeParse({ verificationType: type }).success).toBe(true);
    }
  });

  it('validates reject reason', () => {
    expect(rejectVerificationSchema.safeParse({ reason: 'Blurry document' }).success).toBe(true);
    expect(rejectVerificationSchema.safeParse({ reason: 'ab' }).success).toBe(false);
  });

  it('validates reupload request', () => {
    expect(
      requestReuploadSchema.safeParse({
        reason: 'Please upload a clearer selfie',
        requiredDocuments: ['selfie'],
      }).success,
    ).toBe(true);
  });

  it('validates internal note', () => {
    expect(internalNoteSchema.safeParse({ note: 'Checked against database' }).success).toBe(true);
  });

  it('validates verification UUID param', () => {
    expect(
      verificationIdParamSchema.safeParse({
        verificationId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });

  it('allows empty resubmit body', () => {
    expect(resubmitVerificationSchema.safeParse({}).success).toBe(true);
  });
});

describe('Image dimension utility', () => {
  it('reads PNG dimensions from buffer', () => {
    const pngHeader = Buffer.alloc(24);
    pngHeader[0] = 0x89;
    pngHeader[1] = 0x50;
    pngHeader[2] = 0x4e;
    pngHeader[3] = 0x47;
    pngHeader.writeUInt32BE(400, 16);
    pngHeader.writeUInt32BE(300, 20);
    const dims = getImageDimensions(pngHeader);
    expect(dims).toEqual({ width: 400, height: 300 });
  });

  it('validates dimensions within limits', () => {
    const pngHeader = Buffer.alloc(24);
    pngHeader[0] = 0x89;
    pngHeader[1] = 0x50;
    pngHeader[2] = 0x4e;
    pngHeader[3] = 0x47;
    pngHeader.writeUInt32BE(500, 16);
    pngHeader.writeUInt32BE(500, 20);
    expect(() =>
      validateImageDimensions(pngHeader, {
        minWidth: VERIFICATION_CONSTANTS.MIN_IMAGE_WIDTH,
        minHeight: VERIFICATION_CONSTANTS.MIN_IMAGE_HEIGHT,
        maxWidth: VERIFICATION_CONSTANTS.MAX_IMAGE_WIDTH,
        maxHeight: VERIFICATION_CONSTANTS.MAX_IMAGE_HEIGHT,
      }),
    ).not.toThrow();
  });

  it('rejects images that are too small', () => {
    const pngHeader = Buffer.alloc(24);
    pngHeader[0] = 0x89;
    pngHeader[1] = 0x50;
    pngHeader[2] = 0x4e;
    pngHeader[3] = 0x47;
    pngHeader.writeUInt32BE(50, 16);
    pngHeader.writeUInt32BE(50, 20);
    expect(() =>
      validateImageDimensions(pngHeader, {
        minWidth: 200,
        minHeight: 200,
        maxWidth: 8000,
        maxHeight: 8000,
      }),
    ).toThrow(ValidationError);
  });
});

describe('Encryption utility', () => {
  it('encrypts and decrypts sensitive values', () => {
    const original = 'ABCDE1234F';
    const encrypted = encryptSensitive(original);
    expect(encrypted).not.toBe(original);
    expect(decryptSensitive(encrypted)).toBe(original);
  });
});

describe('Verification providers', () => {
  it('HyperVerge provider returns not configured', async () => {
    const provider = new HyperVergeProvider();
    const result = await provider.verify({
      verificationId: 'v1',
      userId: 'u1',
      documentType: 'AADHAAR',
      frontImageKey: 'key',
    });
    expect(result.success).toBe(false);
  });

  it('Manual provider returns success stub', async () => {
    const provider = new ManualVerificationProvider();
    const result = await provider.verify({
      verificationId: 'v1',
      userId: 'u1',
      documentType: 'AADHAAR',
      frontImageKey: 'key',
    });
    expect(result.success).toBe(true);
  });
});
