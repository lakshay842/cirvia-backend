import { UploadFactory } from '../../../shared/upload/upload.factory.js';
import { EVENTS_CONSTANTS } from '../constants/events.constants.js';

const imageOptions = {
  allowedMimes: EVENTS_CONSTANTS.ALLOWED_IMAGE_MIMES,
  maxBytes: EVENTS_CONSTANTS.MAX_UPLOAD_BYTES,
  invalidTypeMessage: 'Invalid file type. Allowed: jpg, jpeg, png, webp.',
} as const;

export const eventMediaUpload = UploadFactory.fields({
  ...imageOptions,
  fields: [
    { name: 'image', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ],
});
