import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@errors/index.js';
import { getRedisClient } from '@redis/index.js';
import { buildPaginationMeta, parsePagination } from '../../../utils/pagination.util.js';
import { BOOKINGS_CONSTANTS } from '../constants/bookings.constants.js';
import {
  toBookingDetailsDto,
  toBookingSummaryDto,
  toAdminBookingDto,
  toGuestListItemDto,
  toHostBookingSummaryDto,
  toTimelineItemDto,
  toWaitlistItemDto,
  mapAdminStatusFilter,
  mapHostStatusFilter,
  mapStatusFilter,
} from '../dto/bookings.dto.js';
import { emitBookingDomainEvent } from '../events/bookings.events.js';
import { bookingsRepository } from '../repository/bookings.repository.js';
import { promoteNextWaitlistUser } from '../utils/waitlist.validator.js';
import {
  addMinutes,
  calculateAge,
  decimalToNumber,
  generateBookingReference,
  toApiStatus,
} from '../utils/bookings.util.js';
import { scheduleBookingExpiry } from '../events/bookings.queue.js';
import type {
  AttendancePlaceholder,
  AuditMeta,
  BookingAnalyticsPlaceholder,
  CreateBookingResult,
} from '../types/bookings.types.js';
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

export class BookingsService {
  private async invalidateEventCache(eventId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = [
        BOOKINGS_CONSTANTS.REDIS_KEYS.eventCapacity(eventId),
        BOOKINGS_CONSTANTS.REDIS_KEYS.eventBookingCount(eventId),
      ];

      // Event detail pages cache remainingCapacity — bust so spots update after pay/cancel.
      const event = await bookingsRepository.findEventForBooking(eventId);
      if (event?.slug) {
        const { EVENTS_CONSTANTS } = await import(
          '../../events/constants/events.constants.js'
        );
        keys.push(
          EVENTS_CONSTANTS.REDIS_KEYS.details(event.slug),
          EVENTS_CONSTANTS.REDIS_KEYS.featured,
          EVENTS_CONSTANTS.REDIS_KEYS.trending,
        );
      }

      await redis.del(...keys);
    } catch {
      // Redis optional in dev
    }
  }

  private async cacheEventCapacity(eventId: string): Promise<{ remaining: number; total: number } | null> {
    const capacity = await bookingsRepository.getEventCapacity(eventId);
    if (!capacity) return null;

    try {
      const redis = getRedisClient();
      const key = BOOKINGS_CONSTANTS.REDIS_KEYS.eventCapacity(eventId);
      await redis.setex(
        key,
        BOOKINGS_CONSTANTS.REDIS_TTL.capacity,
        JSON.stringify({
          remaining: capacity.remainingCapacity,
          total: capacity.capacity,
        }),
      );
    } catch {
      // ignore
    }

    return { remaining: capacity.remainingCapacity, total: capacity.capacity };
  }

  private async writeAudit(
    action: string,
    entityId: string,
    userId?: string,
    changes?: Record<string, unknown>,
    audit?: AuditMeta,
  ): Promise<void> {
    await bookingsRepository.createAuditLog({
      action,
      entityId,
      ...(userId !== undefined && { userId }),
      ...(changes !== undefined && { changes }),
      ...(audit?.ip !== undefined && { ip: audit.ip }),
      ...(audit?.browser !== undefined && { browser: audit.browser }),
    });
  }

  private validateUserForBooking(user: NonNullable<Awaited<ReturnType<typeof bookingsRepository.findUserById>>>) {
    if (user.accountStatus === 'SUSPENDED') {
      throw new ForbiddenError('Suspended users cannot create bookings.');
    }
    if (user.accountStatus === 'DELETED' || user.isDeleted) {
      throw new ForbiddenError('Account is not active.');
    }
  }

  private validateAge(
    dob: Date | null | undefined,
    minimumAge: number | null,
    maximumAge: number | null,
  ): void {
    if (!minimumAge && !maximumAge) return;
    if (!dob) {
      throw new ValidationError('Date of birth is required for age-restricted events.');
    }
    const age = calculateAge(dob);
    if (minimumAge !== null && age < minimumAge) {
      throw new ValidationError(`Minimum age requirement is ${minimumAge}.`);
    }
    if (maximumAge !== null && age > maximumAge) {
      throw new ValidationError(`Maximum age requirement is ${maximumAge}.`);
    }
  }

  private validateEventBookable(
    event: NonNullable<Awaited<ReturnType<typeof bookingsRepository.findEventForBooking>>>,
  ): void {
    const now = new Date();

    if (!BOOKINGS_CONSTANTS.BOOKABLE_EVENT_STATUSES.includes(
      event.status as (typeof BOOKINGS_CONSTANTS.BOOKABLE_EVENT_STATUSES)[number],
    )) {
      if (event.status === 'CANCELLED') {
        throw new ValidationError('Cannot book a cancelled event.');
      }
      if (event.status === 'ARCHIVED') {
        throw new ValidationError('Cannot book an archived event.');
      }
      if (event.status === 'BOOKING_CLOSED') {
        throw new ValidationError('Booking is closed for this event.');
      }
      throw new ValidationError('Event is not open for booking.');
    }

    if (event.isSuspended) {
      throw new ValidationError('Event is not available for booking.');
    }

    if (now < event.bookingStart) {
      throw new ValidationError('Booking has not opened yet.');
    }

    if (now > event.bookingEnd) {
      throw new ValidationError('Booking window has closed.');
    }

    if (event.eventStart <= now) {
      throw new ValidationError('Cannot book past events.');
    }
  }

  private resolveInitialStatus(
    approvalRequired: boolean,
    price: number,
  ): 'REQUESTED' | 'PENDING_PAYMENT' | 'CONFIRMED' {
    if (approvalRequired) return 'REQUESTED';
    if (price > 0) return 'PENDING_PAYMENT';
    return 'CONFIRMED';
  }

  async createBooking(
    userId: string,
    input: CreateBookingInput,
    audit?: AuditMeta,
  ): Promise<CreateBookingResult> {
    const user = await bookingsRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found.');
    this.validateUserForBooking(user);

    const event = await bookingsRepository.findEventForBooking(input.eventId);
    if (!event) throw new NotFoundError('Event not found.');
    this.validateEventBookable(event);

    if (event.host.userId === userId) {
      throw new ValidationError('You cannot book your own event.');
    }

    this.validateAge(user.profile?.dob ?? null, event.minimumAge, event.maximumAge);

    if (input.couponCode) {
      // Coupon validation deferred to Payments module — accepted in request only
      emitBookingDomainEvent('coupon.placeholder', { couponCode: input.couponCode, eventId: input.eventId });
    }

    const ticketPrice = decimalToNumber(event.price);
    const totalPrice = ticketPrice * input.ticketQuantity;
    const bookingStatus = this.resolveInitialStatus(event.approvalRequired, totalPrice);
    const expiresAt =
      bookingStatus === 'PENDING_PAYMENT'
        ? addMinutes(new Date(), BOOKINGS_CONSTANTS.BOOKING_TIMEOUT_MINUTES)
        : null;

    const bookingReference = generateBookingReference();

    const result = await bookingsRepository.reserveAndCreateBooking({
      eventId: input.eventId,
      userId,
      guestsCount: input.ticketQuantity,
      bookingReference,
      bookingStatus,
      ticketPrice: totalPrice,
      currency: event.currency,
      expiresAt,
      actorId: userId,
      // Paid bookings only take a seat after payment is captured.
      holdCapacity: bookingStatus !== 'PENDING_PAYMENT',
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') throw new NotFoundError('Event not found.');
      throw new ConflictError('Event is fully booked.', {
        code: BOOKINGS_CONSTANTS.ERROR_CODES.EVENT_FULL,
      });
    }

    const { booking } = result;

    if (expiresAt) {
      await scheduleBookingExpiry(booking.id, expiresAt);
    }

    await this.invalidateEventCache(input.eventId);
    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.CREATED,
      booking.id,
      userId,
      { eventId: input.eventId, status: bookingStatus, guestsCount: input.ticketQuantity },
      audit,
    );

    emitBookingDomainEvent('booking.created', { bookingId: booking.id, userId, eventId: input.eventId });

    const response: CreateBookingResult = {
      bookingId: booking.id,
      bookingReference: booking.bookingReference,
      status: booking.bookingStatus,
    };

    if (expiresAt) {
      response.expiresAt = expiresAt.toISOString();
      response.payment = {
        orderId: null,
        amount: totalPrice,
        currency: event.currency,
        gateway: 'razorpay',
        placeholder: true,
      };
    }

    return response;
  }

  async getMyBookings(userId: string, query: MyBookingsQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const statuses = mapStatusFilter(query.status);

    const { items, total } = await bookingsRepository.listUserBookings({
      userId,
      ...(statuses !== undefined && { statuses }),
      skip,
      take: limit,
    });

    return {
      bookings: items.map((b) => toBookingSummaryDto(b)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getBookingDetails(userId: string, bookingId: string) {
    const booking = await bookingsRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');
    return toBookingDetailsDto(booking);
  }

  async getBookingStatus(userId: string, bookingId: string) {
    const booking = await bookingsRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');

    return {
      bookingId: booking.id,
      status: toApiStatus(booking.bookingStatus),
      paymentStatus: booking.paymentStatus,
      expiresAt: booking.expiresAt?.toISOString() ?? null,
    };
  }

  async cancelBooking(userId: string, bookingId: string, input: CancelBookingInput, audit?: AuditMeta) {
    const booking = await bookingsRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');

    if (!BOOKINGS_CONSTANTS.CANCELLABLE_STATUSES.includes(
      booking.bookingStatus as (typeof BOOKINGS_CONSTANTS.CANCELLABLE_STATUSES)[number],
    )) {
      throw new ConflictError('Booking cannot be cancelled.', {
        code: BOOKINGS_CONSTANTS.ERROR_CODES.BOOKING_NOT_CANCELLABLE,
      });
    }

    if (booking.event.eventStart <= new Date()) {
      throw new ValidationError('Cannot cancel after the event has started.');
    }

    const updated = await bookingsRepository.updateBookingStatus(
      bookingId,
      {
        bookingStatus: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: input.reason,
        paymentStatus: booking.paymentStatus === 'CAPTURED' ? booking.paymentStatus : 'CANCELLED',
      },
      'CANCELLED',
      userId,
      { reason: input.reason },
      // Only release seats that were actually held (not unpaid pending-payment holds).
      booking.bookingStatus !== 'PENDING_PAYMENT'
        ? { eventId: booking.eventId, guestsCount: booking.guestsCount }
        : undefined,
    );

    if (!updated) throw new NotFoundError('Booking not found.');

    await this.invalidateEventCache(booking.eventId);
    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.CANCELLED,
      bookingId,
      userId,
      { reason: input.reason },
      audit,
    );

    void promoteNextWaitlistUser(booking.eventId);
    emitBookingDomainEvent('booking.cancelled', { bookingId, userId });

    try {
      const { paymentsService } = await import('../../payments/service/payments.service.js');
      await paymentsService.cancelPaymentForBooking(bookingId);
    } catch {
      // Payment module optional during partial deploy
    }

    return toBookingDetailsDto(updated);
  }

  async requestCancellation(userId: string, bookingId: string, audit?: AuditMeta) {
    const booking = await bookingsRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');

    if (booking.bookingStatus !== 'CONFIRMED' && booking.bookingStatus !== 'APPROVED') {
      throw new ValidationError('Cancellation request is only available for confirmed bookings.');
    }

    await bookingsRepository.updateBookingStatus(
      bookingId,
      { bookingStatus: 'CANCELLATION_REQUESTED' },
      'CANCELLATION_REQUESTED',
      userId,
      { note: 'Host review required — refund policy applies' },
    );

    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.CANCELLATION_REQUESTED,
      bookingId,
      userId,
      {},
      audit,
    );

    return { bookingId, status: 'CANCELLATION_REQUESTED', message: 'Cancellation request submitted.' };
  }

  async getTimeline(userId: string, bookingId: string) {
    const booking = await bookingsRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');

    const history = await bookingsRepository.getBookingHistory(bookingId);
    return { timeline: history.map(toTimelineItemDto) };
  }

  async getHistory(userId: string, query: MyBookingsQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const { items, total } = await bookingsRepository.listUserBookingHistory({ userId, skip, take: limit });

    return {
      history: items.map(toTimelineItemDto),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async joinWaitlist(userId: string, input: JoinWaitlistInput, audit?: AuditMeta) {
    const user = await bookingsRepository.findUserById(userId);
    if (!user) throw new NotFoundError('User not found.');
    this.validateUserForBooking(user);

    const event = await bookingsRepository.findEventForBooking(input.eventId);
    if (!event) throw new NotFoundError('Event not found.');
    this.validateEventBookable(event);

    if (event.host.userId === userId) {
      throw new ValidationError('You cannot join the waitlist for your own event.');
    }

    const capacity = await bookingsRepository.getEventCapacity(input.eventId);
    if (capacity && capacity.remainingCapacity >= 1) {
      throw new ValidationError('Event has available capacity. Create a booking instead.');
    }

    const existingBooking = await bookingsRepository.findExistingBooking(input.eventId, userId);
    if (existingBooking) {
      throw new ConflictError('You already have an active booking for this event.', {
        code: BOOKINGS_CONSTANTS.ERROR_CODES.BOOKING_ALREADY_EXISTS,
      });
    }

    const result = await bookingsRepository.joinWaitlist(input.eventId, userId);
    if ('error' in result && result.error === 'ALREADY_ON_WAITLIST') {
      throw new ConflictError('You are already on the waitlist for this event.', {
        code: BOOKINGS_CONSTANTS.ERROR_CODES.WAITLIST_JOINED,
        waitlistId: result.entry.id,
      });
    }

    const entry = result.entry!;
    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.WAITLIST_JOINED,
      entry.id,
      userId,
      { eventId: input.eventId, position: entry.position },
      audit,
    );

    emitBookingDomainEvent('waitlist.joined', { waitlistId: entry.id, eventId: input.eventId, userId });

    return {
      message: 'Added to waitlist.',
      waitlist: toWaitlistItemDto(entry),
    };
  }

  async leaveWaitlist(userId: string, waitlistId: string, audit?: AuditMeta) {
    const entry = await bookingsRepository.leaveWaitlist(waitlistId, userId);
    if (!entry) throw new NotFoundError('Waitlist entry not found.');

    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.WAITLIST_LEFT,
      waitlistId,
      userId,
      { eventId: entry.eventId },
      audit,
    );

    return { message: 'Removed from waitlist.', waitlistId };
  }

  async getHostBookings(hostUserId: string, query: HostBookingsQuery) {
    const host = await bookingsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
    const statuses = mapHostStatusFilter(query.status);

    const { items, total } = await bookingsRepository.listHostBookings({
      hostId: host.id,
      ...(query.eventId !== undefined && { eventId: query.eventId }),
      ...(statuses !== undefined && { statuses }),
      skip,
      take: limit,
    });

    return {
      bookings: items.map((b) => toHostBookingSummaryDto(b)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async approveBooking(hostUserId: string, bookingId: string, audit?: AuditMeta) {
    const host = await bookingsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const booking = await bookingsRepository.findBookingById(bookingId);
    if (!booking || booking.event.hostId !== host.id) {
      throw new NotFoundError('Booking not found.');
    }

    if (!BOOKINGS_CONSTANTS.HOST_MANAGEABLE_STATUSES.includes(
      booking.bookingStatus as (typeof BOOKINGS_CONSTANTS.HOST_MANAGEABLE_STATUSES)[number],
    )) {
      throw new ValidationError('Only pending booking requests can be approved.');
    }

    if (booking.event.eventStart <= new Date()) {
      throw new ValidationError('Cannot approve bookings after the event has started.');
    }

    const price = decimalToNumber(booking.ticketPrice);
    const nextStatus = price > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED';
    const expiresAt = nextStatus === 'PENDING_PAYMENT'
      ? addMinutes(new Date(), BOOKINGS_CONSTANTS.BOOKING_TIMEOUT_MINUTES)
      : null;

    // REQUESTED bookings hold a seat; unpaid approve releases it until payment succeeds.
    const releaseCapacityOnPendingPayment =
      nextStatus === 'PENDING_PAYMENT'
        ? { eventId: booking.eventId, guestsCount: booking.guestsCount }
        : undefined;

    const updated = await bookingsRepository.updateBookingStatus(
      bookingId,
      {
        bookingStatus: nextStatus,
        approvalStatus: 'APPROVED',
        approver: { connect: { id: hostUserId } },
        approvedAt: new Date(),
        ...(expiresAt !== null && { expiresAt }),
      },
      'APPROVED',
      hostUserId,
      { nextStatus },
      releaseCapacityOnPendingPayment,
    );

    if (!updated) throw new NotFoundError('Booking not found.');

    if (expiresAt) {
      await scheduleBookingExpiry(bookingId, expiresAt);
    }

    await this.invalidateEventCache(booking.eventId);
    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.APPROVED,
      bookingId,
      hostUserId,
      { status: nextStatus },
      audit,
    );

    emitBookingDomainEvent('booking.approved', { bookingId, hostUserId });

    return toBookingDetailsDto(updated);
  }

  async rejectBooking(
    hostUserId: string,
    bookingId: string,
    input: RejectBookingInput,
    audit?: AuditMeta,
  ) {
    const host = await bookingsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const booking = await bookingsRepository.findBookingById(bookingId);
    if (!booking || booking.event.hostId !== host.id) {
      throw new NotFoundError('Booking not found.');
    }

    if (!BOOKINGS_CONSTANTS.HOST_MANAGEABLE_STATUSES.includes(
      booking.bookingStatus as (typeof BOOKINGS_CONSTANTS.HOST_MANAGEABLE_STATUSES)[number],
    )) {
      throw new ValidationError('Only pending booking requests can be rejected.');
    }

    const updated = await bookingsRepository.updateBookingStatus(
      bookingId,
      {
        bookingStatus: 'REJECTED',
        approvalStatus: 'REJECTED',
        rejectionReason: input.reason,
        approver: { connect: { id: hostUserId } },
        approvedAt: new Date(),
      },
      'REJECTED',
      hostUserId,
      { reason: input.reason },
      { eventId: booking.eventId, guestsCount: booking.guestsCount },
    );

    if (!updated) throw new NotFoundError('Booking not found.');

    await this.invalidateEventCache(booking.eventId);
    await this.writeAudit(
      BOOKINGS_CONSTANTS.AUDIT_ACTIONS.REJECTED,
      bookingId,
      hostUserId,
      { reason: input.reason },
      audit,
    );

    void promoteNextWaitlistUser(booking.eventId);
    emitBookingDomainEvent('booking.rejected', { bookingId, hostUserId });

    return toBookingDetailsDto(updated);
  }

  async getGuestList(hostUserId: string, eventId: string, query: GuestListQuery) {
    const host = await bookingsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const event = await bookingsRepository.findEventForBooking(eventId);
    if (!event || event.hostId !== host.id) {
      throw new NotFoundError('Event not found.');
    }

    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 50, maxLimit: 100 });

    const { items, total } = await bookingsRepository.listGuestBookings({
      eventId,
      hostId: host.id,
      skip,
      take: limit,
    });

    return {
      guests: items.map((b) => toGuestListItemDto(b)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async getAttendancePlaceholder(hostUserId: string, eventId: string): Promise<AttendancePlaceholder> {
    const host = await bookingsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const event = await bookingsRepository.findEventForBooking(eventId);
    if (!event || event.hostId !== host.id) {
      throw new NotFoundError('Event not found.');
    }

    const totalGuests = await bookingsRepository.countActiveBookings(eventId);

    return {
      eventId,
      checkedIn: 0,
      totalGuests,
      note: 'Attendance tracking will be implemented with the QR Check-in module.',
    };
  }

  async getBookingAnalyticsPlaceholder(hostUserId: string): Promise<BookingAnalyticsPlaceholder> {
    const host = await bookingsRepository.findHostByUserId(hostUserId);
    if (!host) throw new ForbiddenError('Host profile required.');

    const { total } = await bookingsRepository.listHostBookings({
      hostId: host.id,
      skip: 0,
      take: 1,
    });

    return {
      totalBookings: total,
      confirmedBookings: 0,
      cancelledBookings: 0,
      revenue: null,
      note: 'Detailed booking analytics will be available after the Payments module.',
    };
  }

  async getQrPlaceholder(userId: string, bookingId: string) {
    const booking = await bookingsRepository.findBookingForUser(bookingId, userId);
    if (!booking) throw new NotFoundError('Booking not found.');

    if (booking.bookingStatus !== 'CONFIRMED' && booking.bookingStatus !== 'APPROVED') {
      throw new ForbiddenError('QR ticket is available only after payment is confirmed.');
    }

    return {
      bookingId,
      qrCode: null,
      note: 'QR generation will be implemented after payment verification.',
    };
  }

  async expireBooking(bookingId: string): Promise<void> {
    const updated = await bookingsRepository.expirePendingPaymentBooking(bookingId);
    if (!updated) return;

    await this.invalidateEventCache(updated.eventId);
    await this.writeAudit(BOOKINGS_CONSTANTS.AUDIT_ACTIONS.EXPIRED, bookingId, undefined, {
      reason: 'payment_timeout',
    });

    void promoteNextWaitlistUser(updated.eventId);
    emitBookingDomainEvent('booking.expired', { bookingId });

    try {
      const { paymentsService } = await import('../../payments/service/payments.service.js');
      await paymentsService.cancelPaymentForBooking(bookingId);
    } catch {
      // Payment module optional during partial deploy
    }
  }

  async getEventCapacityCached(eventId: string) {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(BOOKINGS_CONSTANTS.REDIS_KEYS.eventCapacity(eventId));
      if (cached) return JSON.parse(cached) as { remaining: number; total: number };
    } catch {
      // ignore
    }
    return this.cacheEventCapacity(eventId);
  }

  async listAdminBookings(query: AdminBookingsQuery) {
    const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });

    const statuses = mapAdminStatusFilter(query.status ?? 'all');
    const { items, total } = await bookingsRepository.listAdminBookings({
      skip,
      take: limit,
      ...(query.eventId !== undefined && { eventId: query.eventId }),
      ...(statuses !== undefined && { statuses }),
      ...(query.search !== undefined && { search: query.search }),
    });

    return {
      items: items.map((b) => toAdminBookingDto(b)),
      meta: buildPaginationMeta(page, limit, total),
    };
  }
}

export const bookingsService = new BookingsService();
