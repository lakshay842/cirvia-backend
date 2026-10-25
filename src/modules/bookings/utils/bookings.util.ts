import { randomBytes } from 'node:crypto';

export function calculateAge(dob: Date, referenceDate = new Date()): number {
  const ref = new Date(referenceDate);
  let age = ref.getFullYear() - dob.getFullYear();
  const monthDiff = ref.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

/** Unique booking reference — avoids race collisions from count-based sequences. */
export function generateBookingReference(_sequence?: number): string {
  const year = new Date().getFullYear();
  const unique = randomBytes(4).toString('hex').toUpperCase();
  return `BK-${year}-${unique}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function toApiStatus(status: string): string {
  if (status === 'APPROVED') return 'CONFIRMED';
  return status;
}

export function decimalToNumber(value: { toString(): string } | number): number {
  return typeof value === 'number' ? value : Number(value.toString());
}
