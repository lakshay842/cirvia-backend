import { UploadFactory } from '../../../shared/upload/upload.factory.js';
import { VERIFICATION_CONSTANTS } from '../constants/verification.constants.js';

const options = {
  allowedMimes: VERIFICATION_CONSTANTS.ALLOWED_IMAGE_MIMES,
  maxBytes: VERIFICATION_CONSTANTS.MAX_UPLOAD_BYTES,
  invalidTypeMessage: 'Invalid file type. Allowed: jpg, jpeg, png, webp.',
} as const;

const upload = UploadFactory.create(options);

export const verificationUpload = upload;

export const submitVerificationUpload = UploadFactory.fields({
  ...options,
  fields: [
    { name: 'governmentId', maxCount: 1 },
    { name: 'governmentIdBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ],
});

export const resubmitVerificationUpload = submitVerificationUpload;

export const singleDocumentUpload = UploadFactory.single({ ...options, fieldName: 'document' });
