# Event API Compatibility Patch — Report

**Type:** Compatibility patch (pre–Phase 12)  
**Status:** Complete  
**Date:** 2025-06-25  
**Scope:** Event APIs only — expose public-safe `eventId` (UUID)

---

## Problem

The frontend booking flow requires `eventId` (UUID) to call `POST /api/v1/bookings`, but public event endpoints only returned `slug`. First-time visitors booking from discover/event detail could not resolve a UUID without workarounds (session registry, prior bookings).

---

## Solution

Added **`eventId`** (UUID) to all public event response DTOs. This is a public-safe identifier — the same UUID already used in booking and host mutation routes. No private fields (hostId, internal notes, etc.) were added.

**Backward compatible:** All existing fields (`slug`, `title`, etc.) are unchanged. `eventId` is additive only.

---

## Endpoints Affected

All endpoints that return `EventListItemView` or `EventPublicView`:

| Endpoint | Response path |
|----------|---------------|
| `GET /api/v1/events` | `data.items[].eventId` |
| `GET /api/v1/events/featured` | `data.items[].eventId` |
| `GET /api/v1/events/trending` | `data.items[].eventId` |
| `GET /api/v1/events/search` | `data.items[].eventId` |
| `GET /api/v1/events/nearby` | `data.items[].eventId` |
| `GET /api/v1/events/upcoming` | `data.items[].eventId` |
| `GET /api/v1/events/past` | `data.items[].eventId` |
| `GET /api/v1/events/:slug` | `data.event.eventId` |
| `GET /api/v1/hosts/events` | `data.items[].eventId` |

Private/host-by-UUID responses (`EventPrivateView`) continue to expose `id` as before; they now also inherit `eventId` via `toPublicEventDto`.

---

## Files Changed

### Backend

| File | Change |
|------|--------|
| `src/modules/events/types/events.types.ts` | `eventId: string` on `EventListItemView`, `EventPublicView` |
| `src/modules/events/dto/events.dto.ts` | `eventId: event.id` in `toListItemDto`, `toPublicEventDto` |
| `src/docs/common.openapi.ts` | `EventListItem`, `EventPublic` schemas with `eventId` |
| `src/docs/events.openapi.ts` | Response schemas for list/detail public endpoints |
| `tests/events.test.ts` | Assert `eventId` on list + public DTOs |

### Frontend

| File | Change |
|------|--------|
| `frontend-web/src/types/event.types.ts` | `eventId: string` on `EventListItem`, `EventDetail` |

---

## Example Response (list item)

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "slug": "game-night-noida-4f2ab",
  "title": "Friday Game Night",
  "shortDescription": "...",
  "status": "PUBLISHED",
  "price": 499,
  "currency": "INR",
  "eventStart": "2030-06-15T12:30:00.000Z",
  "eventEnd": "2030-06-15T16:30:00.000Z",
  "city": "Noida",
  "coverImageUrl": "https://...",
  "isFeatured": false,
  "isTrending": true,
  "host": { "slug": "...", "displayName": "...", "isVerified": true },
  "category": { "name": "...", "slug": "..." }
}
```

---

## What Was NOT Changed

- No route path changes
- No request schema changes
- No private field exposure
- No frontend booking/host page refactors (types only; pages can adopt `event.eventId` incrementally)
- No database migrations

---

## Tests

| File | Change |
|------|--------|
| `tests/events.test.ts` | +1 test for `toPublicEventDto`; list DTO test asserts `eventId` |

**Total:** 252 tests passing (up from 251)

---

## Quality Gate

```bash
npm run lint        # ✅
npm run typecheck   # ✅
npm test            # ✅ 252/252
npm run build       # ✅
```

Frontend: `npm run typecheck` ✅

---

**STOP — compatibility patch complete. Ready for next backend module.**
