import { UploadFactory } from '../shared/upload/upload.factory.js';
import { USERS_CONSTANTS } from '../modules/users/constants/users.constants.js';

const options = {
  allowedMimes: USERS_CONSTANTS.ALLOWED_IMAGE_MIMES,
  maxBytes: USERS_CONSTANTS.MAX_UPLOAD_BYTES,
  invalidTypeMessage: 'Invalid file type. Allowed: jpg, jpeg, png, webp.',
} as const;

const upload = UploadFactory.create(options);

export const avatarUpload = upload.single('avatar');
export const coverImageUpload = upload.single('cover');
/** @deprecated Use avatarUpload or coverImageUpload */
export const imageUpload = upload;
