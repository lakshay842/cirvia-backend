import { UploadFactory } from '../../../shared/upload/upload.factory.js';
import { HOST_CONSTANTS } from '../constants/hosts.constants.js';

const imageOptions = {
  allowedMimes: HOST_CONSTANTS.ALLOWED_IMAGE_MIMES,
  maxBytes: HOST_CONSTANTS.MAX_UPLOAD_BYTES,
  invalidTypeMessage: 'Invalid file type. Allowed: jpg, jpeg, png, webp.',
} as const;

const documentOptions = {
  allowedMimes: HOST_CONSTANTS.ALLOWED_DOC_MIMES,
  maxBytes: HOST_CONSTANTS.MAX_UPLOAD_BYTES,
  invalidTypeMessage: 'Invalid document type. Allowed: jpg, jpeg, png, webp, pdf.',
} as const;

export const hostAvatarUpload = UploadFactory.single({ ...imageOptions, fieldName: 'avatar' });
export const hostCoverUpload = UploadFactory.single({ ...imageOptions, fieldName: 'cover' });
export const hostGalleryUpload = UploadFactory.single({ ...imageOptions, fieldName: 'image' });
export const hostDocumentsUpload = UploadFactory.fields({
  ...documentOptions,
  fields: [
    { name: 'identityProof', maxCount: 1 },
    { name: 'addressProof', maxCount: 1 },
  ],
});
