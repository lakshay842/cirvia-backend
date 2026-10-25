# Cirvia Backend — Release v1.0

**Version:** 1.0.0  
**Release date:** 2025-06-25  
**Status:** Ready for staging (implemented scope)  
**Audit:** See `BACKEND_AUDIT_V1.md` (Score: 79/100)

---

## Release Summary

Cirvia Backend v1.0 delivers the core platform API for user onboarding, identity verification, host management, event discovery, and atomic event booking. Payment, wallet, reviews, and notification delivery are intentionally excluded from this release.

---

## Implemented Modules

| # | Module | Path | Status |
|---|--------|------|--------|
| 1 | **Authentication** | `src/modules/auth/` | ✅ Complete |
| 2 | **User** | `src/modules/users/` | ✅ Complete |
| 3 | **Verification (KYC)** | `src/modules/verification/` | ✅ Complete |
| 4 | **Host** | `src/modules/hosts/` | ✅ Complete |
| 5 | **Event** | `src/modules/events/` | ✅ Complete |
| 6 | **Booking** | `src/modules/bookings/` | ✅ Complete |

### Module Capabilities

**Authentication**
- Register, login (email, phone, Google), refresh, logout
- Email/phone verification, password reset, change password
- Session management, account deletion, rate limiting

**User**
- Profile CRUD, avatar/cover upload, interests, settings
- Privacy/account/notification preferences
- Follow/unfollow, trust score, activity feed, saved events

**Verification (KYC)**
- Document upload (Aadhaar, Passport, DL, etc.), selfie
- Admin review queue, approve/reject/re-upload
- Encryption, signed URLs, BullMQ async processing (stubs)
- Provider registry (HyperVerge, AuthBridge, etc. — stubs)

**Host**
- Become host, profile CRUD, public slug page
- Media/documents, dashboard, analytics placeholders
- Admin approve/reject/suspend

**Event**
- Host CRUD, publish lifecycle, location/media/rules/tags
- Public discovery: featured, trending, nearby, search
- Admin moderation, categories

**Booking**
- Atomic reservation (`FOR UPDATE`), capacity management
- Create, cancel, approve, reject, waitlist
- BullMQ payment timeout expiry, timeline/history
- Guest list, attendance/QR placeholders

---

## Database Statistics

| Metric | Count |
|--------|-------|
| Prisma models | 95 |
| Enums | 45 |
| Migrations | 6 |
| Seed roles | 5 (USER, HOST, MODERATOR, ADMIN, SUPER_ADMIN) |
| Seed permissions | 16 |
| Seed categories | 10 |
| Tables actively used by v1 API | ~35 |

### Key Tables (v1)

`users`, `user_profiles`, `user_sessions`, `roles`, `permissions`, `verification_requests`, `verification_documents`, `verification_history`, `host_profiles`, `host_addresses`, `host_media`, `host_documents`, `host_activities`, `events`, `event_locations`, `event_media`, `event_rules`, `categories`, `event_bookings`, `booking_history`, `booking_attendees`, `booking_waitlist`, `audit_logs`, `trust_scores`

---

## API Statistics

| Metric | Count |
|--------|-------|
| HTTP route handlers | ~165 |
| OpenAPI documented paths | ~117 |
| API prefix | `/api/v1` |
| Health endpoints | `/health`, `/ready`, `/live` |
| Swagger UI | `/api-docs` |

### Endpoints by Module (approx.)

| Module | Endpoints |
|--------|-----------|
| Auth | 17 |
| Users (+ trust-score, activity, notifications) | 38 |
| Verification (+ admin) | 19 |
| Hosts (+ admin) | 43 |
| Events (+ categories, admin) | 37 |
| Bookings (+ host bookings, guests) | 16 |
| Meta / health | 4 |

---

## Test Statistics

| Metric | Value |
|--------|-------|
| Test files | 14 |
| Test suites (`describe`) | ~44 |
| Test cases | **169** |
| Framework | Vitest 3 + Supertest |
| Coverage tool | `@vitest/coverage-v8` (available via `npm run test:coverage`) |

### Test Files

| File | Type |
|------|------|
| `auth.test.ts` | Unit |
| `users.test.ts` | Unit |
| `verification.test.ts` | Unit |
| `hosts.test.ts` | Unit |
| `events.test.ts` | Unit |
| `bookings.test.ts` | Unit |
| `config.test.ts` | Unit |
| `health.test.ts` | Unit |
| `integration/*.integration.test.ts` (6 files) | Integration |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js ≥22 |
| Framework | Express 5 |
| Language | TypeScript (strict) |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Cache / Queue | Redis + BullMQ |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Storage | AWS S3 (signed URLs) |
| Docs | OpenAPI 3.1 + Swagger UI |
| Logging | Pino |

---

## Known Limitations

### Intentional (Deferred Modules)

- No payment gateway integration (Razorpay placeholder only)
- No wallet, payouts, or invoices
- No reviews (host/guest/event)
- No push notification delivery (preferences API only)
- No QR check-in (placeholder endpoint)
- No CMS, support tickets, webhooks, or full admin API

### Technical Placeholders

- Verification OCR/AI jobs are stubs
- Event/host search uses interface stubs (in-memory nearby)
- Waitlist auto-promotion logs only — no auto-booking
- Booking analytics and attendance are placeholders
- Revenue/analytics fields return `null`

### Operational

- Single Redis instance (no cluster)
- No read replicas configured
- OpenAPI covers ~70% of implemented endpoints
- Module implementation reports only `BOOKING_MODULE_REPORT.md` persisted

---

## Production Checklist

### Infrastructure

- [ ] PostgreSQL 15+ provisioned with connection pooling (PgBouncer)
- [ ] Redis 7+ provisioned (persistent for BullMQ)
- [ ] AWS S3 bucket with private ACL + IAM least privilege
- [ ] Environment variables set per `config/env.ts` schema
- [ ] `NODE_ENV=production` (disables permissive CORS)
- [ ] TLS termination at load balancer
- [ ] `npm run db:migrate:deploy` on deploy

### Security

- [x] JWT secrets rotated from defaults
- [x] Rate limiting enabled (global, auth, booking, search, admin)
- [x] Helmet security headers
- [x] Input validation on all endpoints
- [x] Document encryption (AES-256-GCM)
- [ ] WAF / DDoS protection (infrastructure)
- [ ] Secret manager (AWS Secrets Manager / Vault)

### Application

- [x] BullMQ workers start on boot (booking expiry, verification)
- [x] Graceful shutdown (SIGTERM closes queues, DB, Redis)
- [x] Health/readiness probes
- [x] Structured logging with request IDs
- [ ] APM / error tracking (Sentry, Datadog)
- [ ] Prisma slow query logging

### Monitoring

- [ ] Redis memory alerts
- [ ] Queue depth alerts (BullMQ)
- [ ] DB connection pool saturation
- [ ] API latency p95/p99
- [ ] Failed booking expiry job alerts

### Quality Gate (v1.0 release)

```
npm run lint       ✅ PASS
npm run typecheck  ✅ PASS
npm test           ✅ PASS (169/169)
npm run build      ✅ PASS
```

---

## Audit Fixes Included in v1.0

1. Verification BullMQ worker started on server boot
2. Graceful verification queue shutdown on SIGTERM
3. Booking rate limiter on `POST /api/v1/bookings`
4. Search rate limiter on `GET /api/v1/events/search`
5. Admin rate limiter on all `/api/v1/admin/*` routes

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `BACKEND_AUDIT_V1.md` | Full production audit with scores |
| `BACKEND_IMPROVEMENTS.md` | Prioritized improvement roadmap |
| `BACKEND_RELEASE_v1.md` | This release document |
| `BOOKING_MODULE_REPORT.md` | Booking module deep-dive |
| `API_CONTRACT1–6.md` | API specifications |
| `DATABASE_DESIGN1–4.md` | Database specifications |
| `BACKEND_MASTER_PROMPT1–4.md` | Architecture specifications |
| `TASKS.md` | Implementation progress tracker |

---

## Next Phase

**Backend Phase 9: Payment Module** — awaiting approval.

Do not deploy payment features until Phase 9 is explicitly approved and implemented.

---

**Cirvia Backend v1.0** — Built for trust-first social event hosting.
