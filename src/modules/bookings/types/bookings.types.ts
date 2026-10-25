import type { BookingStatus, BookingPaymentStatus } from '@prisma/client';

export interface AuditMeta {
  ip?: string;
  browser?: string;
}

export interface LockedEventRow {
  id: string;
  remaining_capacity: number;
  capacity: number;
  price: string | number;
  currency: string;
  approval_required: boolean;
  host_id: string;
  status: string;
  booking_start: Date;
  booking_end: Date;
  event_start: Date;
  minimum_age: number | null;
  maximum_age: number | null;
}

export interface PaymentOrderPlaceholder {
  orderId: null;
  amount: number;
  currency: string;
  gateway: 'razorpay';
  placeholder: true;
}

export interface BookingAnalyticsPlaceholder {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  revenue: null;
  note: string;
}

export interface AttendancePlaceholder {
  eventId: string;
  checkedIn: number;
  totalGuests: number;
  note: string;
}

export interface CreateBookingResult {
  bookingId: string;
  bookingReference: string;
  status: BookingStatus;
  payment?: PaymentOrderPlaceholder;
  expiresAt?: string;
}

export type PublicBookingStatus =
  | 'PENDING'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'REFUNDED'
  | 'REQUESTED';

export interface BookingListFilters {
  status?: string;
  page: number;
  limit: number;
}

export interface HostBookingFilters extends BookingListFilters {
  eventId?: string;
}

export type BookingWithRelations = {
  id: string;
  eventId: string;
  userId: string;
  bookingReference: string;
  bookingStatus: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  ticketType: string | null;
  ticketPrice: { toString(): string };
  currency: string;
  guestsCount: number;
  approvalStatus: BookingStatus | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  cancelledAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  cancelReason: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  event: {
    id: string;
    title: string;
    slug: string;
    eventStart: Date;
    eventEnd: Date;
    status: string;
    hostId: string;
    host: { id: string; userId: string; displayName: string | null };
    location: { city: string; venueName: string } | null;
  };
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    profile: { firstName: string; lastName: string; profileImage: string | null } | null;
    hostProfile: {
      id: string;
      displayName: string;
      accountStatus: string;
      verificationStatus: string;
    } | null;
  };
  attendees: Array<{
    id: string;
    guestName: string | null;
    checkedIn: boolean;
    checkedOut: boolean;
  }>;
};
