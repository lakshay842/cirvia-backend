import type { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@common/index.js';
import { HTTP_STATUS } from '@constants/index.js';
import { bookingsService } from '../service/bookings.service.js';
import type {
  AdminBookingsQuery,
  CancelBookingInput,
  CreateBookingInput,
  GuestListQuery,
  HostBookingsQuery,
  JoinWaitlistInput,
  MyBookingsQuery,
  RejectBookingInput,
} from '../schemas/bookings.schema.js';
import { toApiStatus } from '../utils/bookings.util.js';
import type { ApiMeta } from '@common/index.js';

function auditMeta(req: Request): { ip?: string; browser?: string } {
  const meta: { ip?: string; browser?: string } = {};
  if (req.ip) meta.ip = req.ip;
  const browser = req.headers['user-agent'];
  if (browser) meta.browser = browser;
  return meta;
}

export class BookingsController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await bookingsService.createBooking(
        req.user!.id,
        req.body as CreateBookingInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: 'Booking created successfully.',
        data: {
          bookingId: result.bookingId,
          bookingReference: result.bookingReference,
          status: toApiStatus(result.status),
          ...(result.payment !== undefined && { payment: result.payment }),
          ...(result.expiresAt !== undefined && { expiresAt: result.expiresAt }),
        },
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await bookingsService.getMyBookings(
        req.user!.id,
        req.query as unknown as MyBookingsQuery,
      );
      sendSuccess(res, {
        message: 'Bookings retrieved.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const booking = await bookingsService.getBookingDetails(req.user!.id, bookingId);
      sendSuccess(res, { message: 'Booking details retrieved.', data: { booking } });
    } catch (error) {
      next(error);
    }
  };

  getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const status = await bookingsService.getBookingStatus(req.user!.id, bookingId);
      sendSuccess(res, { message: 'Booking status retrieved.', data: status });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const booking = await bookingsService.cancelBooking(
        req.user!.id,
        bookingId,
        req.body as CancelBookingInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Booking cancelled.', data: { booking } });
    } catch (error) {
      next(error);
    }
  };

  requestCancellation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const result = await bookingsService.requestCancellation(
        req.user!.id,
        bookingId,
        auditMeta(req),
      );
      sendSuccess(res, { message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  };

  getTimeline = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const result = await bookingsService.getTimeline(req.user!.id, bookingId);
      sendSuccess(res, { message: 'Booking timeline retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await bookingsService.getHistory(
        req.user!.id,
        req.query as unknown as MyBookingsQuery,
      );
      sendSuccess(res, { message: 'Booking history retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  joinWaitlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await bookingsService.joinWaitlist(
        req.user!.id,
        req.body as JoinWaitlistInput,
        auditMeta(req),
      );
      sendSuccess(res, {
        message: result.message,
        data: result,
        statusCode: HTTP_STATUS.CREATED,
      });
    } catch (error) {
      next(error);
    }
  };

  leaveWaitlist = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { waitlistId } = req.params as { waitlistId: string };
      const result = await bookingsService.leaveWaitlist(
        req.user!.id,
        waitlistId,
        auditMeta(req),
      );
      sendSuccess(res, { message: result.message, data: result });
    } catch (error) {
      next(error);
    }
  };

  getQr = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const result = await bookingsService.getQrPlaceholder(req.user!.id, bookingId);
      sendSuccess(res, { message: 'QR ticket placeholder.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listHostBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await bookingsService.getHostBookings(
        req.user!.id,
        req.query as unknown as HostBookingsQuery,
      );
      sendSuccess(res, { message: 'Host bookings retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const booking = await bookingsService.approveBooking(
        req.user!.id,
        bookingId,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Booking approved.', data: { booking } });
    } catch (error) {
      next(error);
    }
  };

  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { bookingId } = req.params as { bookingId: string };
      const booking = await bookingsService.rejectBooking(
        req.user!.id,
        bookingId,
        req.body as RejectBookingInput,
        auditMeta(req),
      );
      sendSuccess(res, { message: 'Booking rejected.', data: { booking } });
    } catch (error) {
      next(error);
    }
  };

  getGuestList = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const result = await bookingsService.getGuestList(
        req.user!.id,
        eventId,
        req.query as unknown as GuestListQuery,
      );
      sendSuccess(res, { message: 'Guest list retrieved.', data: result });
    } catch (error) {
      next(error);
    }
  };

  getAttendance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId } = req.params as { eventId: string };
      const result = await bookingsService.getAttendancePlaceholder(
        req.user!.id,
        eventId,
      );
      sendSuccess(res, { message: 'Attendance placeholder.', data: result });
    } catch (error) {
      next(error);
    }
  };

  listAdminBookings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await bookingsService.listAdminBookings(
        req.query as unknown as AdminBookingsQuery,
      );
      sendSuccess(res, {
        message: 'Bookings retrieved.',
        data: { items: result.items },
        meta: result.meta as ApiMeta,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const bookingsController = new BookingsController();
