import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import type { ApiMeta } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { ValidationError } from '@errors/index.js';
import { hostsService } from '../service/hosts.service.js';
import type {
  BecomeHostInput,
  UpdateHostProfileInput,
  UpdateHostAddressInput,
  UpdateEmergencyContactInput,
  UpdateHostPreferencesInput,
  UpdateAvailabilityInput,
  UpdateSocialLinksInput,
  AdminHostListQuery,
  RejectHostInput,
} from '../schemas/hosts.schema.js';
import type { UploadedHostFile } from '../types/hosts.types.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

function mapFile(
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
): UploadedHostFile | undefined {
  if (!file) return undefined;
  return {
    buffer: file.buffer,
    mimetype: file.mimetype,
    size: file.size,
    originalname: file.originalname,
  };
}

export class HostsController {
  apply = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const host = await hostsService.becomeHost(
        req.user!.id,
        req.body as BecomeHostInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Host application submitted.',
        data: { host },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const host = await hostsService.getMyProfile(req.user!.id);
      sendSuccess(res, { message: 'Host profile retrieved.', data: { host } });
    } catch (error) {
      next(error);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const host = await hostsService.updateProfile(
        req.user!.id,
        req.body as UpdateHostProfileInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Host profile updated.', data: { host } });
    } catch (error) {
      next(error);
    }
  };

  getPublicProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params as { slug: string };
      const host = await hostsService.getViewableProfile(slug, req.user?.id);
      sendSuccess(res, { message: 'Host profile retrieved.', data: { host } });
    } catch (error) {
      next(error);
    }
  };

  getVerificationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = await hostsService.getVerificationStatus(req.user!.id);
      sendSuccess(res, { message: 'Verification status retrieved.', data: status });
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dashboard = await hostsService.getDashboard(req.user!.id);
      sendSuccess(res, { message: 'Host dashboard retrieved.', data: { dashboard } });
    } catch (error) {
      next(error);
    }
  };

  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const statistics = await hostsService.getStatistics(req.user!.id);
      sendSuccess(res, { message: 'Host statistics retrieved.', data: { statistics } });
    } catch (error) {
      next(error);
    }
  };

  getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const analytics = await hostsService.getAnalytics(req.user!.id);
      sendSuccess(res, { message: 'Host analytics retrieved.', data: { analytics } });
    } catch (error) {
      next(error);
    }
  };

  getBadges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const badges = await hostsService.getBadges(req.user!.id);
      sendSuccess(res, { message: 'Host badges retrieved.', data: { badges } });
    } catch (error) {
      next(error);
    }
  };

  getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const preferences = await hostsService.getPreferences(req.user!.id);
      sendSuccess(res, { message: 'Host preferences retrieved.', data: { preferences } });
    } catch (error) {
      next(error);
    }
  };

  updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const preferences = await hostsService.updatePreferences(
        req.user!.id,
        req.body as UpdateHostPreferencesInput,
      );
      sendSuccess(res, { message: 'Host preferences updated.', data: { preferences } });
    } catch (error) {
      next(error);
    }
  };

  getAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const address = await hostsService.getAddress(req.user!.id);
      sendSuccess(res, { message: 'Host address retrieved.', data: { address } });
    } catch (error) {
      next(error);
    }
  };

  updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const address = await hostsService.updateAddress(
        req.user!.id,
        req.body as UpdateHostAddressInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Host address updated.', data: { address } });
    } catch (error) {
      next(error);
    }
  };

  getEmergencyContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const emergencyContact = await hostsService.getEmergencyContact(req.user!.id);
      sendSuccess(res, { message: 'Emergency contact retrieved.', data: { emergencyContact } });
    } catch (error) {
      next(error);
    }
  };

  updateEmergencyContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const emergencyContact = await hostsService.updateEmergencyContact(
        req.user!.id,
        req.body as UpdateEmergencyContactInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Emergency contact updated.', data: { emergencyContact } });
    } catch (error) {
      next(error);
    }
  };

  getSocialLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const socialLinks = await hostsService.getSocialLinks(req.user!.id);
      sendSuccess(res, { message: 'Social links retrieved.', data: { socialLinks } });
    } catch (error) {
      next(error);
    }
  };

  updateSocialLinks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const socialLinks = await hostsService.updateSocialLinks(
        req.user!.id,
        req.body as UpdateSocialLinksInput,
      );
      sendSuccess(res, { message: 'Social links updated.', data: { socialLinks } });
    } catch (error) {
      next(error);
    }
  };

  getAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const availability = await hostsService.getAvailability(req.user!.id);
      sendSuccess(res, { message: 'Availability retrieved.', data: { availability } });
    } catch (error) {
      next(error);
    }
  };

  updateAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const availability = await hostsService.updateAvailability(
        req.user!.id,
        req.body as UpdateAvailabilityInput,
      );
      sendSuccess(res, { message: 'Availability updated.', data: { availability } });
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = mapFile(req.file as Parameters<typeof mapFile>[0]);
      if (!file) throw new ValidationError('Avatar file is required.');
      const result = await hostsService.uploadAvatar(req.user!.id, file, auditMeta(req));
      sendSuccess(res, { message: 'Avatar uploaded.', data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadCover = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = mapFile(req.file as Parameters<typeof mapFile>[0]);
      if (!file) throw new ValidationError('Cover image file is required.');
      const result = await hostsService.uploadCover(req.user!.id, file, auditMeta(req));
      sendSuccess(res, { message: 'Cover image uploaded.', data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadGallery = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = mapFile(req.file as Parameters<typeof mapFile>[0]);
      if (!file) throw new ValidationError('Gallery image file is required.');
      const result = await hostsService.uploadGallery(req.user!.id, file, auditMeta(req));
      sendSuccess(res, { message: 'Gallery image uploaded.', data: result, statusCode: HTTP_STATUS.CREATED });
    } catch (error) {
      next(error);
    }
  };

  deleteGalleryItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mediaId } = req.params as { mediaId: string };
      const result = await hostsService.deleteGalleryItem(req.user!.id, mediaId);
      sendSuccess(res, { message: 'Gallery item deleted.', data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const files = req.files as Record<string, { buffer: Buffer; mimetype: string; size: number; originalname: string }[]> | undefined;
      const uploadFiles: { identityProof?: UploadedHostFile; addressProof?: UploadedHostFile } = {};
      const identityProof = mapFile(files?.identityProof?.[0]);
      const addressProof = mapFile(files?.addressProof?.[0]);
      if (identityProof) uploadFiles.identityProof = identityProof;
      if (addressProof) uploadFiles.addressProof = addressProof;
      const result = await hostsService.uploadDocuments(
        req.user!.id,
        uploadFiles,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Documents uploaded.',
        data: result,
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  listDocuments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const documents = await hostsService.listDocuments(req.user!.id);
      sendSuccess(res, { message: 'Documents retrieved.', data: { documents } });
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const timeline = await hostsService.getTimeline(req.user!.id);
      sendSuccess(res, { message: 'Host timeline retrieved.', data: { timeline } });
    } catch (error) {
      next(error);
    }
  };

  getActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as { page?: number; limit?: number };
      const result = await hostsService.getActivity(req.user!.id, query);
      sendSuccess(res, {
        message: 'Host activity retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getProfileCompletion = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const completion = await hostsService.getProfileCompletion(req.user!.id);
      sendSuccess(res, { message: 'Profile completion retrieved.', data: { completion } });
    } catch (error) {
      next(error);
    }
  };

  deactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await hostsService.deactivate(req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'Host profile deactivated.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reactivate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await hostsService.reactivate(req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'Host profile reactivated.', data: result });
    } catch (error) {
      next(error);
    }
  };

  // Admin
  listAdminHosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await hostsService.listAdminHosts(req.query as AdminHostListQuery);
      sendSuccess(res, {
        message: 'Hosts retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminHostDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hostId } = req.params as { hostId: string };
      const host = await hostsService.getAdminHostDetails(hostId);
      sendSuccess(res, { message: 'Host details retrieved.', data: { host } });
    } catch (error) {
      next(error);
    }
  };

  approveHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hostId } = req.params as { hostId: string };
      const host = await hostsService.approveHost(hostId, req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'Host approved.', data: { host } });
    } catch (error) {
      next(error);
    }
  };

  rejectHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hostId } = req.params as { hostId: string };
      const host = await hostsService.rejectHost(
        hostId,
        req.user!.id,
        req.body as RejectHostInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Host rejected.', data: { host } });
    } catch (error) {
      next(error);
    }
  };

  suspendHost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hostId } = req.params as { hostId: string };
      const host = await hostsService.suspendHost(hostId, req.user!.id, auditMeta(req));
      sendSuccess(res, { message: 'Host suspended.', data: { host } });
    } catch (error) {
      next(error);
    }
  };
}

export const hostsController = new HostsController();
