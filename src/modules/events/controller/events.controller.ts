import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import type { ApiMeta } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { ValidationError } from '@errors/index.js';
import { eventsService } from '../service/events.service.js';
import type {
  CreateEventInput,
  UpdateEventInput,
  CancelEventInput,
  RejectEventInput,
  HostEventsQuery,
  PublicEventsQuery,
  NearbyEventsQuery,
  SearchEventsQuery,
  UpdateEventLocationInput,
  ReorderMediaInput,
  AddRuleInput,
  AddTagsInput,
} from '../schemas/events.schema.js';
import type { UploadedEventFile } from '../types/events.types.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const ua = req.headers['user-agent'];
  if (ua) meta.browser = ua;
  return meta;
}

function mapFile(
  file: { buffer: Buffer; mimetype: string; size: number; originalname: string } | undefined,
): UploadedEventFile | undefined {
  if (!file) return undefined;
  return { buffer: file.buffer, mimetype: file.mimetype, size: file.size, originalname: file.originalname };
}

export class EventsController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.createEvent(
        req.user!.id,
        req.body as CreateEventInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Event created successfully.',
        data: { eventId: result.eventId, slug: result.slug, event: result.event },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.updateEvent(
        req.user!.id,
        eventId,
        req.body as UpdateEventInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Event updated.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const result = await eventsService.deleteEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event deleted.', data: result });
    } catch (error) {
      next(error);
    }
  };

  publish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.publishEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event submitted for review.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  unpublish = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.unpublishEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event unpublished.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.cancelEvent(
        req.user!.id,
        eventId,
        req.body as CancelEventInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Event cancelled.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.archiveEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event archived.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  duplicate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.duplicateEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, {
        message: 'Event duplicated.',
        data: { event },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.getEventById(req.user!.id, eventId);
      sendSuccess(res, { message: 'Event retrieved.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params as { slug: string };
      const event = await eventsService.getViewableBySlug(slug, req.user?.id);
      sendSuccess(res, { message: 'Event retrieved.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  listPublic = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listPublicEvents(req.query as PublicEventsQuery);
      sendSuccess(res, {
        message: 'Events retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  listFeatured = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listFeatured(req.query as { page?: number; limit?: number });
      sendSuccess(res, { message: 'Featured events retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listTrending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listTrending(req.query as { page?: number; limit?: number });
      sendSuccess(res, { message: 'Trending events retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listNearby = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listNearby(req.query as unknown as NearbyEventsQuery);
      sendSuccess(res, {
        message: 'Nearby events retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.searchEvents(req.query as SearchEventsQuery);
      sendSuccess(res, {
        message: 'Search results retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  listUpcoming = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listUpcoming(req.query as PublicEventsQuery);
      sendSuccess(res, {
        message: 'Upcoming events retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  listPast = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listPast(req.query as PublicEventsQuery);
      sendSuccess(res, {
        message: 'Past events retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  listHostEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listHostEvents(req.user!.id, req.query as HostEventsQuery);
      sendSuccess(res, {
        message: 'Host events retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const analytics = await eventsService.getHostAnalyticsPlaceholder(req.user!.id, eventId);
      sendSuccess(res, { message: 'Event analytics retrieved.', data: { analytics } });
    } catch (error) {
      next(error);
    }
  };

  updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const location = await eventsService.updateLocation(
        req.user!.id,
        eventId,
        req.body as UpdateEventLocationInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Location updated.', data: { location } });
    } catch (error) {
      next(error);
    }
  };

  getLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const location = await eventsService.getLocation(req.user!.id, eventId);
      sendSuccess(res, { message: 'Location retrieved.', data: { location } });
    } catch (error) {
      next(error);
    }
  };

  addRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const rules = await eventsService.addRule(req.user!.id, eventId, req.body as AddRuleInput);
      sendSuccess(res, { message: 'Rule added.', data: { rules }, statusCode: HTTP_STATUS.CREATED });
    } catch (error) {
      next(error);
    }
  };

  deleteRule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId, ruleId } = req.params as { eventId: string; ruleId: string };
      const result = await eventsService.deleteRule(req.user!.id, eventId, ruleId);
      sendSuccess(res, { message: 'Rule deleted.', data: result });
    } catch (error) {
      next(error);
    }
  };

  addTags = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const tags = await eventsService.addTags(req.user!.id, eventId, req.body as AddTagsInput);
      sendSuccess(res, { message: 'Tags added.', data: { tags } });
    } catch (error) {
      next(error);
    }
  };

  removeTag = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId, tagId } = req.params as { eventId: string; tagId: string };
      const result = await eventsService.removeTag(req.user!.id, eventId, tagId);
      sendSuccess(res, { message: 'Tag removed.', data: result });
    } catch (error) {
      next(error);
    }
  };

  uploadMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const files = req.files as Record<string, { buffer: Buffer; mimetype: string; size: number; originalname: string }[]> | undefined;
      const cover = mapFile(files?.cover?.[0]);
      const image = mapFile(files?.image?.[0]) ?? mapFile(req.file as Parameters<typeof mapFile>[0]);
      const file = cover ?? image;
      if (!file) throw new ValidationError('Image file is required.');
      const media = await eventsService.uploadMedia(
        req.user!.id,
        eventId,
        file,
        Boolean(cover),
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Media uploaded.', data: { media }, statusCode: HTTP_STATUS.CREATED });
    } catch (error) {
      next(error);
    }
  };

  deleteMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { mediaId } = req.params as { mediaId: string };
      const result = await eventsService.deleteMedia(req.user!.id, mediaId, auditMeta(req));
      sendSuccess(res, { message: 'Media deleted.', data: result });
    } catch (error) {
      next(error);
    }
  };

  reorderMedia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const media = await eventsService.reorderMedia(
        req.user!.id,
        eventId,
        req.body as ReorderMediaInput,
      );
      sendSuccess(res, { message: 'Media reordered.', data: { media } });
    } catch (error) {
      next(error);
    }
  };

  listCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categories = await eventsService.listCategories();
      sendSuccess(res, { message: 'Categories retrieved.', data: { categories } });
    } catch (error) {
      next(error);
    }
  };

  getCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params as { slug: string };
      const category = await eventsService.getCategoryBySlug(slug);
      sendSuccess(res, { message: 'Category retrieved.', data: { category } });
    } catch (error) {
      next(error);
    }
  };

  // Admin
  listPending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await eventsService.listPendingAdmin(req.query as { page?: number; limit?: number });
      sendSuccess(res, {
        message: 'Pending events retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };

  getAdminEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.getAdminEvent(eventId);
      sendSuccess(res, { message: 'Event retrieved.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.approveEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event approved.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.rejectEvent(
        req.user!.id,
        eventId,
        req.body as RejectEventInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Event rejected.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  feature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.featureEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event featured.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  unfeature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.unfeatureEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event unfeatured.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  suspend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.suspendEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event suspended.', data: { event } });
    } catch (error) {
      next(error);
    }
  };

  restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const event = await eventsService.restoreEvent(req.user!.id, eventId, auditMeta(req));
      sendSuccess(res, { message: 'Event restored.', data: { event } });
    } catch (error) {
      next(error);
    }
  };
}

export const eventsController = new EventsController();
