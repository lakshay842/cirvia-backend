import { getLogger } from '@logger/index.js';
import { BOOKINGS_CONSTANTS } from '../constants/bookings.constants.js';
import { bookingsRepository } from '../repository/bookings.repository.js';
import { emitBookingDomainEvent } from '../events/bookings.events.js';
import { scheduleBookingExpiry } from '../events/bookings.queue.js';

const logger = getLogger();

/**
 * When capacity is released, promote the next waitlisted user into a booking
 * and dispatch a domain notification.
 */
export async function promoteNextWaitlistUser(eventId: string): Promise<void> {
  const result = await bookingsRepository.promoteNextWaitlistEntry(eventId);

  if ('error' in result) {
    if (result.error === 'NO_WAITLIST') {
      logger.debug({ eventId }, 'No waitlist entries to promote');
      return;
    }
    if (result.error === 'NO_CAPACITY') {
      logger.debug({ eventId }, 'No capacity available for waitlist promotion');
      return;
    }
    if (result.error === 'USER_HAS_BOOKING') {
      logger.info({ eventId }, 'Skipped waitlist entry — user already has active booking');
      void promoteNextWaitlistUser(eventId);
      return;
    }
    return;
  }

  const { booking, waitlistId, userId } = result;

  if (booking.expiresAt) {
    await scheduleBookingExpiry(booking.id, booking.expiresAt);
  }

  logger.info(
    { eventId, userId, waitlistId, bookingId: booking.id, status: booking.bookingStatus },
    'Waitlist user promoted to booking',
  );

  emitBookingDomainEvent('booking.created', { bookingId: booking.id, userId, eventId });
  emitBookingDomainEvent(BOOKINGS_CONSTANTS.HISTORY_ACTIONS.WAITLIST_PROMOTED, {
    eventId,
    userId,
    waitlistId,
    bookingId: booking.id,
  });
}
