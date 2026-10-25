import { randomBytes } from 'node:crypto';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export function generateEventSlug(title: string, city?: string): string {
  const base = [slugify(title), city ? slugify(city) : ''].filter(Boolean).join('-');
  const suffix = randomBytes(3).toString('hex');
  return `${base}-${suffix}`.slice(0, 120);
}

export function parseEventDateTime(
  eventDate: string,
  time: string,
  timezone = 'Asia/Kolkata',
): Date {
  const datePart = eventDate.includes('T') ? eventDate.slice(0, 10) : eventDate;
  const timePart = time.length === 5 ? `${time}:00` : time;
  // Store as UTC ISO from local date+time; production would use timezone lib
  const iso = `${datePart}T${timePart}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date/time: ${iso}`);
  }
  void timezone;
  return parsed;
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function hashQuery(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url').slice(0, 32);
}
