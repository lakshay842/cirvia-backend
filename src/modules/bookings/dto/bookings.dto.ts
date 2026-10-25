import type { BookingStatus } from '@prisma/client';
import type { BookingWithRelations } from '../types/bookings.types.js';
import { decimalToNumber, toApiStatus } from '../utils/bookings.util.js';

export function toBookingSummaryDto(booking: BookingWithRelations) {
  return {
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    status: toApiStatus(booking.bookingStatus),
    paymentStatus: booking.paymentStatus,
    guestsCount: booking.guestsCount,
    ticketPrice: decimalToNumber(booking.ticketPrice),
    currency: booking.currency,
    event: {
      eventId: booking.event.id,
      title: booking.event.title,
      slug: booking.event.slug,
      eventStart: booking.event.eventStart.toISOString(),
      eventEnd: booking.event.eventEnd.toISOString(),
      city: booking.event.location?.city ?? null,
      venueName: booking.event.location?.venueName ?? null,
    },
    createdAt: booking.createdAt.toISOString(),
    ...(booking.expiresAt !== null && { expiresAt: booking.expiresAt.toISOString() }),
  };
}

export function toHostBookingSummaryDto(booking: BookingWithRelations) {
  const hostProfile = booking.user.hostProfile;
  const isVerifiedHost = hostProfile?.accountStatus === 'VERIFIED';

  return {
    ...toBookingSummaryDto(booking),
    guest: {
      userId: booking.user.id,
      email: booking.user.email,
      firstName: booking.user.profile?.firstName ?? null,
      lastName: booking.user.profile?.lastName ?? null,
      profileImage: booking.user.profile?.profileImage ?? null,
      emailVerified: booking.user.emailVerified,
      phoneVerified: booking.user.phoneVerified,
      isVerifiedHost,
      hostAccountStatus: hostProfile?.accountStatus ?? null,
      hostVerificationStatus: hostProfile?.verificationStatus ?? null,
    },
  };
}

export function toBookingDetailsDto(booking: BookingWithRelations) {
  return {
    ...toBookingSummaryDto(booking),
    ticketType: booking.ticketType,
    approvalStatus: booking.approvalStatus ? toApiStatus(booking.approvalStatus) : null,
    approvedAt: booking.approvedAt?.toISOString() ?? null,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    cancelReason: booking.cancelReason,
    rejectionReason: booking.rejectionReason,
    host: {
      hostId: booking.event.host.id,
      displayName: booking.event.host.displayName,
    },
    attendees: booking.attendees.map((a) => ({
      attendeeId: a.id,
      guestName: a.guestName,
      checkedIn: a.checkedIn,
      checkedOut: a.checkedOut,
    })),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function toGuestListItemDto(booking: BookingWithRelations) {
  const hostProfile = booking.user.hostProfile;
  return {
    bookingId: booking.id,
    bookingReference: booking.bookingReference,
    status: toApiStatus(booking.bookingStatus),
    guestsCount: booking.guestsCount,
    guest: booking.user.profile
      ? {
          userId: booking.user.id,
          firstName: booking.user.profile.firstName,
          lastName: booking.user.profile.lastName,
          avatarUrl: booking.user.profile.profileImage,
          email: booking.user.email,
          emailVerified: booking.user.emailVerified,
          phoneVerified: booking.user.phoneVerified,
          isVerifiedHost: hostProfile?.accountStatus === 'VERIFIED',
        }
      : {
          userId: booking.user.id,
          firstName: null,
          lastName: null,
          avatarUrl: null,
          email: booking.user.email,
          emailVerified: booking.user.emailVerified,
          phoneVerified: booking.user.phoneVerified,
          isVerifiedHost: hostProfile?.accountStatus === 'VERIFIED',
        },
    attendees: booking.attendees.map((a) => ({
      attendeeId: a.id,
      guestName: a.guestName,
      checkedIn: a.checkedIn,
    })),
  };
}

export function toTimelineItemDto(entry: {
  id: string;
  action: string;
  metadata: unknown;
  actorId: string | null;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    action: entry.action,
    metadata: entry.metadata,
    actorId: entry.actorId,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toWaitlistItemDto(entry: {
  id: string;
  eventId: string;
  position: number;
  status: string;
  joinedAt: Date;
}) {
  return {
    waitlistId: entry.id,
    eventId: entry.eventId,
    position: entry.position,
    status: entry.status,
    joinedAt: entry.joinedAt.toISOString(),
  };
}

export function mapStatusFilter(
  filter: string,
): BookingStatus[] | undefined {
  switch (filter) {
    case 'upcoming':
      return ['REQUESTED', 'PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'APPROVED'];
    case 'past':
      return ['COMPLETED', 'NO_SHOW'];
    case 'cancelled':
      return ['CANCELLED', 'REJECTED', 'EXPIRED', 'REFUNDED'];
    case 'pending':
      return ['REQUESTED', 'PENDING', 'PENDING_PAYMENT'];
    case 'confirmed':
      return ['CONFIRMED', 'APPROVED'];
    default:
      return undefined;
  }
}

export function mapHostStatusFilter(filter: string): BookingStatus[] | undefined {
  switch (filter) {
    case 'pending':
      return ['REQUESTED', 'PENDING'];
    case 'confirmed':
      return ['CONFIRMED', 'APPROVED', 'PENDING_PAYMENT'];
    case 'cancelled':
      return ['CANCELLED', 'EXPIRED'];
    case 'rejected':
      return ['REJECTED'];
    default:
      return undefined;
  }
}

export function mapAdminStatusFilter(filter: string): BookingStatus[] | undefined {
  switch (filter) {
    case 'pending':
      return ['REQUESTED', 'PENDING', 'PENDING_PAYMENT'];
    case 'confirmed':
      return ['CONFIRMED', 'APPROVED'];
    case 'cancelled':
      return ['CANCELLED', 'EXPIRED'];
    case 'rejected':
      return ['REJECTED'];
    case 'completed':
      return ['COMPLETED', 'NO_SHOW'];
    case 'refunded':
      return ['REFUNDED'];
    default:
      return undefined;
  }
}

export function toAdminBookingDto(booking: BookingWithRelations) {
  return {
    ...toBookingSummaryDto(booking),
    ticketType: booking.ticketType,
    host: {
      hostId: booking.event.host.id,
      displayName: booking.event.host.displayName,
    },
    user: {
      userId: booking.user.id,
      email: booking.user.email,
      firstName: booking.user.profile?.firstName ?? null,
      lastName: booking.user.profile?.lastName ?? null,
      profileImage: booking.user.profile?.profileImage ?? null,
    },
    updatedAt: booking.updatedAt.toISOString(),
  };
}
