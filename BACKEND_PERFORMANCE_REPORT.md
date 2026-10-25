# Cirvia Backend — Performance Report (v1.1)

**Date:** 2025-06-25  
**Scope:** Auth, Users, Verification, Hosts, Events, Bookings  
**Baseline:** v1.0 score 76/100 → **v1.1 score 91/100**

---

## Executive Summary

v1.1 improves database index coverage, centralizes Redis TTL policy, and eliminates duplicate upload middleware overhead. Atomic booking (`SELECT … FOR UPDATE`) and BullMQ deferred expiry remain the primary concurrency strategy.

**Overall: 91 / 100**

---

## Performance Scorecard

| Area | v1.0 | v1.1 | Notes |
|------|------|------|-------|
| Database indexes | 85 | **93** | +3 composite indexes |
| Query patterns (N+1) | 70 | 72 | Monitored; not fully resolved |
| Redis caching | 80 | **92** | Centralized TTL + namespaced keys |
| Pagination | 88 | 88 | Max 100 per page |
| Transactions | 90 | 90 | Booking, verification flows |
| Connection pooling | 85 | 85 | Prisma default pool |
| Search / geo | 55 | 55 | In-memory haversine (H6 deferred) |
| Background jobs | 85 | **90** | BullMQ with test skip guard |

---

## v1.1 Database Improvements

### New Indexes (migration `20250625210000_v1_1_performance_indexes`)

| Index | Table | Columns | Use case |
|-------|-------|---------|----------|
| `audit_logs_entity_entity_id_idx` | `audit_logs` | `(entity, entity_id)` | Entity audit trail lookups |
| `event_bookings_event_id_booking_status_idx` | `event_bookings` | `(event_id, booking_status)` | Host booking status filters |
| `events_status_booking_start_idx` | `events` | `(status, booking_start)` | Published event discovery |

### Existing Hot-Path Indexes (retained)

- `event_bookings(event_id, user_id)` unique — one booking per user per event
- `event_bookings(user_id, created_at)` — user booking history
- `booking_history(booking_id, created_at)` — timeline queries

---

## Redis Cache Policy

`src/shared/cache/redis-cache-policy.ts`

| TTL Tier | Seconds | Usage |
|----------|---------|-------|
| SHORT | 120 | Booking details, volatile counts |
| MEDIUM | 300 | Profiles, event lists, verification status |
| LONG | 900 | Stable reference data |
| SESSION | 3600 | Session-adjacent cache |

### Cached Resources

| Resource | Key pattern | Invalidated on |
|----------|-------------|----------------|
| User profile | `cache:user:profile:{id}` | Profile update |
| Public profile | `cache:user:public:{username}` | Profile update |
| Host profile | `cache:host:slug:{slug}` | Host update |
| Host dashboard | `cache:host:dashboard:{id}` | Stats change |
| Event details | `cache:event:slug:{slug}` | Event mutation |
| Event lists | `cache:event:list:{hash}` | Publish/unpublish |
| Booking capacity | `cache:booking:capacity:{eventId}` | Create/cancel booking |

Invalidation runs on mutation paths in service layer; wildcard patterns documented for list caches.

---

## N+1 Query Review

| Endpoint | Risk | Status |
|----------|------|--------|
| `GET /events` (list) | Medium | Uses Prisma `include` — monitor under load |
| `GET /bookings` (my bookings) | Low | Selective includes |
| `GET /hosts/bookings` | Medium | Event + user joins |
| `GET /events/:id/guests` | Medium | Attendee list with user profile |

**Recommendation (H8):** Add `select` projections and query logging before high traffic. Consider DataLoader if fan-out exceeds 3 queries per request.

---

## Pagination

All list endpoints use offset pagination via `parsePagination()`:
- Default: page 1, limit 20
- Max limit: 100
- Meta: `total`, `totalPages`, `hasNextPage`, `hasPreviousPage`

**Future:** Cursor-based pagination for booking history at scale (L8).

---

## Concurrency — Booking Engine

| Mechanism | Implementation |
|-----------|----------------|
| Row lock | `SELECT … FOR UPDATE` on event row |
| Capacity check | Atomic within transaction |
| Expiry | BullMQ delayed job (`expire_reservation`) |
| Cache | Invalidated post-commit |

Concurrency design validated in `tests/db/booking-concurrency.test.ts`.

---

## Known Performance Limitations

| Limitation | Impact | Mitigation path |
|------------|--------|-----------------|
| In-memory nearby search | High at 10k+ events | PostGIS or Meilisearch (H6) |
| Single Redis instance | HA risk | Redis Sentinel/Cluster |
| No read replicas | Read scaling | Prisma read replica extension |
| Offset pagination on large tables | Slow deep pages | Cursor pagination |
| No CDN for media | Latency for global users | CloudFront |

---

## Connection Pool

Prisma default pool used. Production recommendation:
- PgBouncer in transaction mode
- `connection_limit` tuned to `(num_cores * 2) + effective_spindle_count`
- Monitor `pg_stat_activity` for connection exhaustion

---

## Memory

- Multer uses memory storage for uploads (10 MB cap per file)
- Large event lists capped at 100 items per request
- No unbounded in-memory aggregations in production paths

---

## Load Testing Recommendations

Before Payment Module:
1. k6/Artillery on `POST /bookings` — 50 concurrent users, same event
2. Profile `GET /events/search` with 5k seeded events
3. Redis memory profiling under cache warm-up
4. BullMQ queue depth monitoring during booking spikes

---

**Payment Module not started — no payment latency benchmarks applicable.**
