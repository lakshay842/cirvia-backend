import { prisma } from '@database/index.js';
import type { BookingStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { LockedEventRow } from '../types/bookings.types.js';

export const bookingInclude = {
  event: {
    include: {
      host: { select: { id: true, userId: true, displayName: true } },
      location: { select: { city: true, venueName: true } },
    },
  },
  user: {
    select: {
      id: true,
      email: true,
      emailVerified: true,
      phoneVerified: true,
      profile: { select: { firstName: true, lastName: true, profileImage: true } },
      hostProfile: {
        select: {
          id: true,
          displayName: true,
          accountStatus: true,
          verificationStatus: true,
        },
      },
    },
  },
  attendees: {
    select: { id: true, guestName: true, checkedIn: true, checkedOut: true },
  },
} satisfies Prisma.EventBookingInclude;

const notDeleted = { deletedAt: null } as const;

/** Terminal statuses that free the (eventId, userId) slot for a new attempt. */
const REUSABLE_BOOKING_STATUSES: BookingStatus[] = [
  'CANCELLED',
  'REJECTED',
  'EXPIRED',
  'REFUNDED',
];

export class BookingsRepository {
  async findUserById(userId: string) {
    return prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true },
    });
  }

  async findEventForBooking(eventId: string) {
    return prisma.event.findFirst({
      where: { id: eventId, ...notDeleted },
      include: { host: { select: { id: true, userId: true } } },
    });
  }

  async findHostByUserId(userId: string) {
    return prisma.hostProfile.findFirst({ where: { userId, deletedAt: null } });
  }

  async findBookingById(bookingId: string) {
    return prisma.eventBooking.findFirst({
      where: { id: bookingId, ...notDeleted },
      include: bookingInclude,
    });
  }

  async findBookingForUser(bookingId: string, userId: string) {
    return prisma.eventBooking.findFirst({
      where: { id: bookingId, userId, ...notDeleted },
      include: bookingInclude,
    });
  }

  async findExistingBooking(eventId: string, userId: string) {
    return prisma.eventBooking.findFirst({
      where: {
        eventId,
        userId,
        ...notDeleted,
        bookingStatus: {
          notIn: ['CANCELLED', 'REJECTED', 'EXPIRED', 'REFUNDED'],
        },
      },
    });
  }

  async countBookingsForReference(): Promise<number> {
    const year = new Date().getFullYear();
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
    return prisma.eventBooking.count({
      where: { createdAt: { gte: start, lt: end } },
    });
  }

  async lockEventForUpdate(tx: Prisma.TransactionClient, eventId: string): Promise<LockedEventRow | null> {
    const rows = await tx.$queryRaw<LockedEventRow[]>`
      SELECT
        e.id,
        e.remaining_capacity,
        e.capacity,
        e.price,
        e.currency,
        e.approval_required,
        e.host_id,
        e.status::text AS status,
        e.booking_start,
        e.booking_end,
        e.event_start,
        e.minimum_age,
        e.maximum_age
      FROM events e
      WHERE e.id = ${eventId}::uuid
        AND e.deleted_at IS NULL
      FOR UPDATE
    `;
    return rows[0] ?? null;
  }

  async reserveAndCreateBooking(params: {
    eventId: string;
    userId: string;
    guestsCount: number;
    bookingReference: string;
    bookingStatus: BookingStatus;
    ticketPrice: number;
    currency: string;
    expiresAt: Date | null;
    actorId: string;
    /** When false, only checks capacity — seats are taken after payment is captured. */
    holdCapacity?: boolean;
  }) {
    const holdCapacity = params.holdCapacity ?? true;

    return prisma.$transaction(async (tx) => {
      const locked = await this.lockEventForUpdate(tx, params.eventId);
      if (!locked) return { error: 'NOT_FOUND' as const };

      if (locked.remaining_capacity < params.guestsCount) {
        return { error: 'EVENT_FULL' as const };
      }

      if (holdCapacity) {
        await tx.event.update({
          where: { id: params.eventId },
          data: { remainingCapacity: { decrement: params.guestsCount } },
        });
      }

      const booking = await tx.eventBooking.create({
        data: {
          eventId: params.eventId,
          userId: params.userId,
          bookingReference: params.bookingReference,
          bookingStatus: params.bookingStatus,
          paymentStatus: 'PENDING',
          ticketPrice: params.ticketPrice,
          currency: params.currency,
          guestsCount: params.guestsCount,
          ...(params.expiresAt !== null && { expiresAt: params.expiresAt }),
        },
        include: bookingInclude,
      });

      const attendeeData = Array.from({ length: params.guestsCount }, (_, index) => ({
        bookingId: booking.id,
        ...(index === 0 ? { userId: params.userId } : {}),
      }));

      await tx.bookingAttendee.createMany({ data: attendeeData });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          action: 'CREATED',
          actorId: params.actorId,
          metadata: {
            status: params.bookingStatus,
            guestsCount: params.guestsCount,
            capacityHeld: holdCapacity,
          },
        },
      });

      return { booking };
    });
  }

  async claimCapacityForBooking(
    tx: Prisma.TransactionClient,
    eventId: string,
    guestsCount: number,
  ): Promise<'OK' | 'EVENT_FULL' | 'NOT_FOUND'> {
    const locked = await this.lockEventForUpdate(tx, eventId);
    if (!locked) return 'NOT_FOUND';
    if (locked.remaining_capacity < guestsCount) return 'EVENT_FULL';

    await tx.event.update({
      where: { id: eventId },
      data: { remainingCapacity: { decrement: guestsCount } },
    });
    return 'OK';
  }

  async releaseCapacityAndUpdate(
    tx: Prisma.TransactionClient,
    eventId: string,
    guestsCount: number,
    bookingId: string,
    data: Prisma.EventBookingUpdateInput,
    historyAction: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ) {
    await tx.event.update({
      where: { id: eventId },
      data: { remainingCapacity: { increment: guestsCount } },
    });

    const booking = await tx.eventBooking.update({
      where: { id: bookingId },
      data,
      include: bookingInclude,
    });

    await tx.bookingHistory.create({
      data: {
        bookingId,
        action: historyAction,
        ...(actorId !== undefined && { actorId }),
        ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
      },
    });

    return booking;
  }

  async updateBookingStatus(
    bookingId: string,
    data: Prisma.EventBookingUpdateInput,
    historyAction: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
    releaseCapacity?: { eventId: string; guestsCount: number },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.eventBooking.findFirst({
        where: { id: bookingId, ...notDeleted },
      });
      if (!existing) return null;

      if (releaseCapacity) {
        return this.releaseCapacityAndUpdate(
          tx,
          releaseCapacity.eventId,
          releaseCapacity.guestsCount,
          bookingId,
          data,
          historyAction,
          actorId,
          metadata,
        );
      }

      const booking = await tx.eventBooking.update({
        where: { id: bookingId },
        data,
        include: bookingInclude,
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          action: historyAction,
          ...(actorId !== undefined && { actorId }),
          ...(metadata !== undefined && { metadata: metadata as Prisma.InputJsonValue }),
        },
      });

      return booking;
    });
  }

  async listUserBookings(params: {
    userId: string;
    statuses?: BookingStatus[];
    skip: number;
    take: number;
  }) {
    const where: Prisma.EventBookingWhereInput = {
      userId: params.userId,
      ...notDeleted,
      ...(params.statuses?.length ? { bookingStatus: { in: params.statuses } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return { items, total };
  }

  async listHostBookings(params: {
    hostId: string;
    eventId?: string;
    statuses?: BookingStatus[];
    skip: number;
    take: number;
  }) {
    const where: Prisma.EventBookingWhereInput = {
      ...notDeleted,
      event: { hostId: params.hostId, deletedAt: null },
      ...(params.eventId !== undefined && { eventId: params.eventId }),
      ...(params.statuses?.length ? { bookingStatus: { in: params.statuses } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return { items, total };
  }

  async listAdminBookings(params: {
    eventId?: string;
    statuses?: BookingStatus[];
    search?: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EventBookingWhereInput = {
      ...notDeleted,
      ...(params.eventId !== undefined && { eventId: params.eventId }),
      ...(params.statuses?.length ? { bookingStatus: { in: params.statuses } } : {}),
      ...(params.search
        ? {
            OR: [
              { bookingReference: { contains: params.search, mode: 'insensitive' } },
              { user: { email: { contains: params.search, mode: 'insensitive' } } },
              {
                user: {
                  profile: {
                    is: { firstName: { contains: params.search, mode: 'insensitive' } },
                  },
                },
              },
              {
                user: {
                  profile: {
                    is: { lastName: { contains: params.search, mode: 'insensitive' } },
                  },
                },
              },
              { event: { title: { contains: params.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return { items, total };
  }

  async listGuestBookings(params: {
    eventId: string;
    hostId: string;
    skip: number;
    take: number;
  }) {
    const where: Prisma.EventBookingWhereInput = {
      eventId: params.eventId,
      ...notDeleted,
      event: { hostId: params.hostId },
      bookingStatus: { in: ['CONFIRMED', 'APPROVED', 'COMPLETED', 'PENDING_PAYMENT'] },
    };

    const [items, total] = await Promise.all([
      prisma.eventBooking.findMany({
        where,
        include: bookingInclude,
        orderBy: { createdAt: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.eventBooking.count({ where }),
    ]);

    return { items, total };
  }

  async getBookingHistory(bookingId: string) {
    return prisma.bookingHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listUserBookingHistory(params: { userId: string; skip: number; take: number }) {
    const where: Prisma.BookingHistoryWhereInput = {
      booking: { userId: params.userId, ...notDeleted },
    };

    const [items, total] = await Promise.all([
      prisma.bookingHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: params.skip,
        take: params.take,
      }),
      prisma.bookingHistory.count({ where }),
    ]);

    return { items, total };
  }

  async findWaitlistEntry(eventId: string, userId: string) {
    return prisma.bookingWaitlist.findFirst({
      where: { eventId, userId, status: { in: ['WAITING', 'NOTIFIED'] } },
    });
  }

  async findWaitlistById(waitlistId: string, userId: string) {
    return prisma.bookingWaitlist.findFirst({
      where: { id: waitlistId, userId },
    });
  }

  async findNextWaitlistEntry(eventId: string) {
    return prisma.bookingWaitlist.findFirst({
      where: { eventId, status: 'WAITING' },
      orderBy: { position: 'asc' },
    });
  }

  async promoteNextWaitlistEntry(eventId: string): Promise<
    | { error: 'NO_CAPACITY' | 'NO_WAITLIST' | 'USER_HAS_BOOKING' }
    | {
        booking: Awaited<ReturnType<typeof prisma.eventBooking.create>>;
        waitlistId: string;
        userId: string;
      }
  > {
    return prisma.$transaction(async (tx) => {
      const waitlistEntry = await tx.bookingWaitlist.findFirst({
        where: { eventId, status: 'WAITING' },
        orderBy: { position: 'asc' },
      });

      if (!waitlistEntry) return { error: 'NO_WAITLIST' as const };

      const locked = await this.lockEventForUpdate(tx, eventId);
      if (!locked || locked.remaining_capacity < 1) {
        return { error: 'NO_CAPACITY' as const };
      }

      const existingBooking = await tx.eventBooking.findFirst({
        where: {
          eventId,
          userId: waitlistEntry.userId,
          ...notDeleted,
          bookingStatus: {
            notIn: REUSABLE_BOOKING_STATUSES,
          },
        },
      });

      if (existingBooking) {
        await tx.bookingWaitlist.update({
          where: { id: waitlistEntry.id },
          data: { status: 'CANCELLED' },
        });
        return { error: 'USER_HAS_BOOKING' as const };
      }

      const ticketPrice = Number(locked.price);
      const bookingStatus = locked.approval_required
        ? 'REQUESTED'
        : ticketPrice > 0
          ? 'PENDING_PAYMENT'
          : 'CONFIRMED';

      // Paid waitlist promotions only take a seat after payment is captured.
      const holdCapacity = bookingStatus !== 'PENDING_PAYMENT';
      if (holdCapacity) {
        await tx.event.update({
          where: { id: eventId },
          data: { remainingCapacity: { decrement: 1 } },
        });
      }

      const year = new Date().getFullYear();
      const bookingReference = `BK-${year}-${randomBytes(4).toString('hex').toUpperCase()}`;

      const expiresAt =
        bookingStatus === 'PENDING_PAYMENT'
          ? new Date(Date.now() + 15 * 60 * 1000)
          : null;

      const booking = await tx.eventBooking.create({
        data: {
          eventId,
          userId: waitlistEntry.userId,
          bookingReference,
          bookingStatus,
          paymentStatus: 'PENDING',
          ticketPrice,
          currency: locked.currency,
          guestsCount: 1,
          ...(expiresAt !== null && { expiresAt }),
        },
        include: bookingInclude,
      });

      await tx.bookingAttendee.create({
        data: { bookingId: booking.id, userId: waitlistEntry.userId },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          action: 'CREATED',
          metadata: {
            source: 'WAITLIST_PROMOTION',
            waitlistId: waitlistEntry.id,
            capacityHeld: holdCapacity,
          },
        },
      });

      await tx.bookingWaitlist.update({
        where: { id: waitlistEntry.id },
        data: { status: 'CONVERTED', notifiedAt: new Date() },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          action: 'WAITLIST_PROMOTED',
          metadata: { waitlistId: waitlistEntry.id },
        },
      });

      return { booking, waitlistId: waitlistEntry.id, userId: waitlistEntry.userId };
    });
  }

  async joinWaitlist(eventId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.bookingWaitlist.findFirst({
        where: { eventId, userId, status: { in: ['WAITING', 'NOTIFIED'] } },
      });
      if (existing) return { error: 'ALREADY_ON_WAITLIST' as const, entry: existing };

      const maxPosition = await tx.bookingWaitlist.aggregate({
        where: { eventId, status: 'WAITING' },
        _max: { position: true },
      });

      const entry = await tx.bookingWaitlist.create({
        data: {
          eventId,
          userId,
          position: (maxPosition._max.position ?? 0) + 1,
        },
      });

      return { entry };
    });
  }

  async leaveWaitlist(waitlistId: string, userId: string) {
    const entry = await prisma.bookingWaitlist.findFirst({
      where: { id: waitlistId, userId, status: { in: ['WAITING', 'NOTIFIED'] } },
    });
    if (!entry) return null;

    return prisma.bookingWaitlist.update({
      where: { id: waitlistId },
      data: { status: 'CANCELLED' },
    });
  }

  async getEventCapacity(eventId: string) {
    const event = await prisma.event.findFirst({
      where: { id: eventId, ...notDeleted },
      select: { remainingCapacity: true, capacity: true },
    });
    return event;
  }

  async countActiveBookings(eventId: string) {
    return prisma.eventBooking.count({
      where: {
        eventId,
        ...notDeleted,
        bookingStatus: {
          in: ['REQUESTED', 'PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'APPROVED'],
        },
      },
    });
  }

  async createAuditLog(data: {
    userId?: string;
    action: string;
    entityId: string;
    changes?: Record<string, unknown>;
    ip?: string;
    browser?: string;
  }) {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: 'booking',
        entityId: data.entityId,
        ...(data.userId !== undefined && { userId: data.userId }),
        ...(data.changes !== undefined && { changes: data.changes as Prisma.InputJsonValue }),
        ...(data.ip !== undefined && { ip: data.ip }),
        ...(data.browser !== undefined && { browser: data.browser }),
      },
    });
  }

  async expirePendingPaymentBooking(bookingId: string) {
    return prisma.$transaction(async (tx) => {
      const booking = await tx.eventBooking.findFirst({
        where: {
          id: bookingId,
          bookingStatus: 'PENDING_PAYMENT',
          ...notDeleted,
        },
      });
      if (!booking) return null;
      if (booking.expiresAt && booking.expiresAt > new Date()) return null;

      // Pending-payment bookings do not hold capacity, so expire without releasing seats.
      const updated = await tx.eventBooking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: 'EXPIRED',
          paymentStatus: 'CANCELLED',
        },
        include: bookingInclude,
      });

      await tx.payment.updateMany({
        where: {
          bookingId,
          paymentStatus: { in: ['PENDING', 'AUTHORIZED', 'FAILED'] },
        },
        data: { paymentStatus: 'CANCELLED' },
      });

      await tx.bookingHistory.create({
        data: {
          bookingId,
          action: 'EXPIRED',
          metadata: { reason: 'payment_timeout', capacityReleased: false },
        },
      });

      return updated;
    });
  }
}

export const bookingsRepository = new BookingsRepository();
