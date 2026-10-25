/**
 * Central Redis TTL policy — all modules must use these keys and TTLs.
 */
export const REDIS_CACHE_POLICY = {
  TTL: {
    SHORT: 120,
    MEDIUM: 300,
    LONG: 900,
    SESSION: 3600,
  },
  keys: {
    userProfile: (userId: string) => `cache:user:profile:${userId}`,
    userPublicProfile: (username: string) => `cache:user:public:${username}`,
    verificationStatus: (userId: string) => `cache:verification:status:${userId}`,
    verificationDetails: (verificationId: string) => `cache:verification:details:${verificationId}`,
    hostProfile: (slug: string) => `cache:host:slug:${slug}`,
    hostDashboard: (hostId: string) => `cache:host:dashboard:${hostId}`,
    eventDetails: (slug: string) => `cache:event:slug:${slug}`,
    eventList: (hash: string) => `cache:event:list:${hash}`,
    eventSearch: (hash: string) => `cache:event:search:${hash}`,
    eventFeatured: () => `cache:event:featured`,
    eventTrending: () => `cache:event:trending`,
    bookingCapacity: (eventId: string) => `cache:booking:capacity:${eventId}`,
    bookingCount: (eventId: string) => `cache:booking:count:${eventId}`,
    bookingDetails: (bookingId: string) => `cache:booking:details:${bookingId}`,
    walletSummary: (userId: string) => `cache:wallet:summary:${userId}`,
    notificationUnread: (userId: string) => `cache:notifications:unread:${userId}`,
    reviewEventStats: (eventId: string) => `cache:reviews:event:stats:${eventId}`,
    reviewHostStats: (hostId: string) => `cache:reviews:host:stats:${hostId}`,
    reviewEventList: (eventId: string, hash: string) => `cache:reviews:event:list:${eventId}:${hash}`,
    reviewHostList: (hostId: string, hash: string) => `cache:reviews:host:list:${hostId}:${hash}`,
    reportsAdminQueue: (hash: string) => `cache:reports:admin:queue:${hash}`,
    reportDetail: (reportId: string) => `cache:reports:detail:${reportId}`,
    analyticsDashboard: (period: string) => `cache:analytics:dashboard:${period}`,
    analyticsMetric: (name: string, period: string) => `cache:analytics:${name}:${period}`,
  },
  invalidatePatterns: {
    user: (userId: string, username?: string) => [
      `cache:user:profile:${userId}`,
      ...(username ? [`cache:user:public:${username}`] : []),
    ],
    host: (hostId: string, slug?: string) => [
      `cache:host:dashboard:${hostId}`,
      ...(slug ? [`cache:host:slug:${slug}`] : []),
    ],
    event: (eventId: string, slug?: string) => [
      ...(slug ? [`cache:event:slug:${slug}`] : []),
      `cache:booking:capacity:${eventId}`,
      `cache:booking:count:${eventId}`,
      'cache:event:list:*',
      'cache:event:featured',
      'cache:event:trending',
      'cache:event:search:*',
    ],
    booking: (eventId: string, bookingId: string) => [
      `cache:booking:capacity:${eventId}`,
      `cache:booking:count:${eventId}`,
      `cache:booking:details:${bookingId}`,
    ],
    verification: (userId: string, verificationId?: string) => [
      `cache:verification:status:${userId}`,
      ...(verificationId ? [`cache:verification:details:${verificationId}`] : []),
    ],
    wallet: (userId: string) => [`cache:wallet:summary:${userId}`],
    notifications: (userId: string) => [`cache:notifications:unread:${userId}`],
    reviews: (eventId?: string, hostId?: string) => [
      ...(eventId ? [`cache:reviews:event:stats:${eventId}`, `cache:reviews:event:list:${eventId}:*`] : []),
      ...(hostId ? [`cache:reviews:host:stats:${hostId}`, `cache:reviews:host:list:${hostId}:*`] : []),
    ],
    reports: (reportId?: string) => [
      ...(reportId ? [`cache:reports:detail:${reportId}`] : []),
      'cache:reports:admin:queue:*',
      'cache:reports:mine:*',
    ],
    analytics: () => ['cache:analytics:*'],
  },
} as const;

export async function invalidateCacheKeys(
  redis: { del: (...keys: string[]) => Promise<unknown> },
  keys: string[],
): Promise<void> {
  if (keys.length === 0) return;
  const concrete = keys.filter((k) => !k.includes('*'));
  if (concrete.length > 0) {
    await redis.del(...concrete);
  }
}
