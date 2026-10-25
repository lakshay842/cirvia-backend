# Cirvia Backend — V1 Improvements Roadmap

**Based on:** `BACKEND_AUDIT_V1.md`  
**Date:** 2025-06-25

---

## Critical Issues

> None blocking v1 staging for implemented modules. All critical booking race-condition risks are mitigated via `FOR UPDATE` transactions.

| # | Issue | Module | Action |
|---|-------|--------|--------|
| — | — | — | No critical blockers identified post-audit fixes |

---

## High Priority Improvements

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| H1 | **OpenAPI incomplete** — ~48 implemented endpoints undocumented in Swagger | API consumer confusion | Expand `auth.openapi.ts`; add events rules/tags/guests paths |
| H2 | **No repository/integration DB tests** | Regression risk on transactions | Add testcontainers PostgreSQL suite for booking concurrency |
| H3 | **Module layout inconsistency** | Developer onboarding friction | Standardize on flat or layered structure across all modules |
| H4 | **Duplicate upload middleware** (4 files) | Maintenance burden | Extract `createUploadMiddleware({ maxSize, allowedMimes })` shared util |
| H5 | **S3 placeholder URLs in dev** | Misconfigured prod could leak fake URLs | Fail hard when `AWS_*` missing in `NODE_ENV=production` |
| H6 | **Nearby search in-memory** | Performance collapse at scale | Integrate PostGIS or Meilisearch geo before high traffic |
| H7 | **Missing module reports on disk** | Documentation drift | Restore or regenerate reports for Auth, User, KYC, Host, Event |
| H8 | **N+1 on event/booking lists** | Slow list endpoints | Audit Prisma queries; add `select` projections; consider DataLoader |

---

## Medium Priority Improvements

| # | Issue | Impact | Recommendation |
|---|-------|--------|----------------|
| M1 | Cross-module route imports | Tight coupling | Extract shared route registrars or event bus for host-booking routes |
| M2 | Dual API paths (follow, trust-score, notifications) | Contract ambiguity | Deprecate one style; document canonical paths |
| M3 | Unused auth middleware (`requireAdmin`, `requireVerification`) | Dead API surface | Apply where business rules require or remove exports |
| M4 | `remaining_capacity` reconciliation | Drift from manual DB edits | Nightly cron to recalc from active bookings |
| M5 | Auth OpenAPI only 6/17 paths | Incomplete docs | Document all auth endpoints |
| M6 | No structured API versioning strategy | Future breaking changes | Add `Accept-Version` header or `/v2` plan |
| M7 | Verification jobs are stubs | KYC automation incomplete | Wire real OCR provider before auto-approval |
| M8 | Waitlist auto-promotion stub | Lost revenue when seats free | Implement auto-booking on cancel with notification |
| M9 | `core/bootstrap.ts` unused | Dead code | Remove or use as server entry wrapper |
| M10 | Search stubs never wired | Dead code in bundle | Import stubs in service layer or remove until Search module |

---

## Low Priority Improvements

| # | Issue | Recommendation |
|---|-------|----------------|
| L1 | Scaffold `.gitkeep` directories | Remove until modules are started |
| L2 | `eventSingleImageUpload` unused export | Remove |
| L3 | Import path inconsistency (`@middleware` vs relative) | ESLint rule for alias-only imports |
| L4 | `audit_logs` missing composite index | Add `@@index([entity, entityId])` |
| L5 | Payment rate limiter defined but unused | Wire when Payment module starts |
| L6 | Admin IP allowlist | Optional middleware for `/admin/*` |
| L7 | Refresh token device binding | Store device fingerprint hash on session |
| L8 | Cursor-based pagination | Replace offset pagination on high-volume lists |
| L9 | Email/SMS provider mocks | Add real Twilio/SES integration tests |
| L10 | Husky pre-commit scope | Ensure lint + typecheck on commit |

---

## Future Improvements

### Payment Module (Phase 9+)
- Gateway adapter interface (Razorpay → Stripe/Cashfree)
- Idempotent payment webhooks
- Wallet ledger with double-entry accounting
- Payout scheduling post-event

### Notifications Module
- Replace logger stubs with BullMQ notification jobs
- FCM/APNs push, email templates, SMS OTP delivery
- User preference enforcement

### Search Module
- Meilisearch/Elasticsearch indexing for events and hosts
- Replace in-memory haversine with PostGIS

### Reviews Module
- One-review-per-booking enforcement
- Trust score integration

### Admin & CMS
- Full admin dashboard API
- CMS pages, banners, FAQs
- Support ticket system

### Infrastructure
- Redis Cluster / Sentinel
- Read replicas for Prisma
- OpenTelemetry tracing
- Kubernetes health probes (already have `/health`, `/ready`, `/live`)

### AI / Communities / Chat
- Schema exists; no implementation — plan as separate services

---

## Technical Debt

| Item | Effort | Priority |
|------|--------|----------|
| Unify module folder structure | 2–3 days | High |
| Shared upload middleware factory | 0.5 day | High |
| Complete OpenAPI coverage | 1–2 days | High |
| PostgreSQL integration test suite | 3–5 days | High |
| Remove dead exports and scaffold dirs | 0.5 day | Low |
| Regenerate missing module reports | 1 day | Medium |
| PostGIS migration for locations | 2–3 days | Medium |
| Capacity reconciliation job | 1 day | Medium |

---

## Recommended Refactoring

### 1. Shared Upload Factory

```typescript
// src/utils/upload-factory.util.ts
export function createMemoryUpload(options: UploadOptions) { ... }
```

Replace duplicates in `upload.middleware.ts`, `events-upload.middleware.ts`, `hosts-upload.middleware.ts`, `verification-upload.middleware.ts`.

### 2. Standardize Module Layout

Adopt flat structure (matching 5/6 modules):

```
src/modules/{name}/
  {name}.controller.ts
  {name}.service.ts
  {name}.repository.ts
  {name}.routes.ts
  {name}.schema.ts
  {name}.dto.ts
  {name}.constants.ts
  {name}.types.ts
  {name}.events.ts
  middleware/   # only when needed
```

Refactor `bookings/` to match when convenient.

### 3. Route Decoupling

Move host event/booking routes to a `host-routes.registry.ts` or mount bookings guest routes via explicit sub-router export instead of importing controllers across modules.

### 4. Test Infrastructure

```
tests/
  integration/     # Supertest + mocked services (current)
  db/              # Testcontainers PostgreSQL
    booking.concurrency.test.ts
    booking.transaction.test.ts
```

### 5. Production Config Guard

```typescript
if (config.NODE_ENV === 'production' && !config.AWS_S3_BUCKET) {
  throw new Error('AWS_S3_BUCKET required in production');
}
```

---

## Priority Matrix

```
         IMPACT
         High ─────────────────────────────
              │ H2 Tests    H4 Upload    │
              │ H6 Search   H1 OpenAPI   │
              │                           │
         Med  │ M4 Capacity  M1 Coupling  │
              │                           │
         Low  │ L3 Imports  L1 Scaffold  │
              └───────────────────────────┘
                Low    Effort    High
```

**Suggested order:** H4 → H1 → H2 → H5 → H6 → M4 → Payment module (separate phase)
