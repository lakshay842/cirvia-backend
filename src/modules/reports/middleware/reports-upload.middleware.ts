import multer from 'multer';
import { REPORTS_CONSTANTS } from '../constants/reports.constants.js';

const storage = multer.memoryStorage();

export const reportEvidenceUpload = multer({
  storage,
  limits: { fileSize: REPORTS_CONSTANTS.MAX_ATTACHMENT_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed.'));
    }
  },
}).single('evidence');
