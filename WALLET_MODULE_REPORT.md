# Wallet Module — Implementation Report

**Phase:** Backend Phase 10  
**Status:** Complete  
**Date:** 2025-06-25  
**Notifications / Reviews:** NOT implemented (by design)

---

## Completed Features

### Wallet & Balances
- [x] `GET /api/v1/wallet` — host wallet summary (available, pending, lifetime earnings/withdrawals)
- [x] Auto-create wallet on first access (`getOrCreateWallet`)
- [x] **Available balance** — funds settled after event completion, withdrawable
- [x] **Pending balance** — host net earnings held until event ends
- [x] Redis cache on wallet summary (`cache:wallet:summary:{userId}`, SHORT TTL)

### Ledger & Transactions
- [x] Ledger-first design — every balance change creates a `wallet_transactions` row
- [x] Row-level `FOR UPDATE` locking on wallet during ledger append
- [x] Transaction types: `CREDIT`, `DEBIT`, `WITHDRAWAL`, `REFUND`, `COMMISSION`, `ADJUSTMENT`
- [x] `GET /api/v1/wallet/transactions` — paginated ledger history with type filter

### Credits & Debits
- [x] **Credit** — `creditHostEarningsFromPayment()` on payment capture (pending + lifetime earnings)
- [x] **Commission** — separate `COMMISSION` ledger entry (audit only, no balance delta)
- [x] **Debit** — on withdrawal approval (`lifetimeWithdrawals` increment)
- [x] **Refund reversal** — `reverseHostEarningsFromPayment()` on admin refund

### Settlement
- [x] Pending → available after `eventEnd` via `ADJUSTMENT` ledger entry
- [x] Idempotent per payment (`hasSettlementForPayment`)
- [x] Immediate settlement when event already ended at credit time
- [x] Delayed settlement via BullMQ `SETTLE_PAYMENT` job (`runAfter: eventEnd`)
- [x] **Settlement queue** — `processSettlementBatch()` scans settleable captured payments
- [x] Payment queue `SCHEDULE_SETTLEMENT` delegates to wallet service

### Withdrawals
- [x] `POST /api/v1/wallet/withdraw` — request withdrawal (min ₹100, max ₹500,000)
- [x] `GET /api/v1/wallet/withdrawals` — host withdrawal history
- [x] Debits available balance immediately; creates `HostPayout` PENDING
- [x] Requires verified bank account (`verificationStatus === APPROVED`)

### Admin Payout Approval / Rejection
- [x] `GET /api/v1/admin/payouts` — `payments.read`
- [x] `PATCH /api/v1/admin/payouts/:payoutId/approve` — `payments.refund`
- [x] `PATCH /api/v1/admin/payouts/:payoutId/reject` — `payments.refund` (restores available balance)

### Bank Accounts
- [x] `GET/POST/PATCH/DELETE /api/v1/wallet/bank-accounts[/:id]`
- [x] Primary account flag, IFSC/UPI support
- [x] New accounts default to `PENDING` verification

### Cross-Cutting
- [x] Audit logs on all wallet lifecycle events
- [x] Domain events (`wallet.credited`, `wallet.settled`, `wallet.withdrawal_*`, etc.)
- [x] BullMQ `wallet` queue — settle, batch, reverse refund
- [x] OpenAPI documentation (`wallet.openapi.ts`)
- [x] Zod strict validation on all mutating endpoints
- [x] Host-only access (`requireHost`) on `/wallet` routes

---

## Module Structure

```
src/modules/wallet/
  controller/wallet.controller.ts
  service/wallet.service.ts
  repository/wallet.repository.ts
  routes/wallet.routes.ts
  schemas/wallet.schema.ts
  dto/wallet.dto.ts
  types/wallet.types.ts
  constants/wallet.constants.ts
  utils/wallet.util.ts
  utils/ledger.util.ts
  events/wallet.events.ts
  events/wallet.queue.ts
  middleware/wallet.middleware.ts
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/wallet` | JWT + Host | Wallet summary |
| GET | `/api/v1/wallet/transactions` | JWT + Host | Ledger history |
| POST | `/api/v1/wallet/withdraw` | JWT + Host | Request withdrawal |
| GET | `/api/v1/wallet/withdrawals` | JWT + Host | Withdrawal history |
| GET | `/api/v1/wallet/bank-accounts` | JWT + Host | List bank accounts |
| POST | `/api/v1/wallet/bank-accounts` | JWT + Host | Add bank account |
| PATCH | `/api/v1/wallet/bank-accounts/:id` | JWT + Host | Update bank account |
| DELETE | `/api/v1/wallet/bank-accounts/:id` | JWT + Host | Delete bank account |
| GET | `/api/v1/admin/payouts` | JWT + `payments.read` | Admin payout list |
| PATCH | `/api/v1/admin/payouts/:payoutId/approve` | JWT + `payments.refund` | Approve payout |
| PATCH | `/api/v1/admin/payouts/:payoutId/reject` | JWT + `payments.refund` | Reject payout |

---

## Database Tables Used

| Table | Usage |
|-------|-------|
| `wallets` | Host balance (available, pending, lifetime totals) |
| `wallet_transactions` | Immutable ledger entries |
| `host_payouts` | Withdrawal requests and status |
| `host_bank_accounts` | Payout destination accounts |
| `payments` | Source for credits/settlement |
| `audit_logs` | Wallet audit trail |

No new migrations required — schema pre-modeled in v1.

---

## Wallet Flow

```
Payment captured (verify / webhook)
  → creditHostEarningsFromPayment()
  → CREDIT ledger (pending += netAmount)
  → COMMISSION ledger (audit)
  → enqueue SETTLE_PAYMENT at eventEnd (or settle immediately)

Event ends
  → settlePayment()
  → ADJUSTMENT ledger (pending → available)

Host withdraws
  → WITHDRAWAL ledger (available -= amount)
  → HostPayout PENDING

Admin approves
  → DEBIT ledger (lifetimeWithdrawals += amount)
  → HostPayout COMPLETED

Admin rejects
  → ADJUSTMENT ledger (available restored)
  → HostPayout CANCELLED

Admin refund on payment
  → reverseHostEarningsFromPayment()
  → REFUND ledger (available/pending reversed)
```

---

## BullMQ Jobs

| Job | Trigger | Action |
|-----|---------|--------|
| `settle_payment` | After credit, delayed to `eventEnd` | `walletService.settlePayment()` |
| `process_settlement_batch` | Manual / cron | `walletService.processSettlementBatch()` |
| `reverse_refund` | Optional async path | `walletService.reverseHostEarningsFromPayment()` |

Queue name: `wallet` — worker started in `server.ts` alongside payment worker.

---

## Redis Cache

| Key | TTL | Invalidated on |
|-----|-----|----------------|
| `cache:wallet:summary:{userId}` | SHORT | Any ledger change for host |

---

## Tests

| File | Tests |
|------|-------|
| `tests/wallet.test.ts` | 8 (schemas, utils, ledger) |
| `tests/integration/wallet.integration.test.ts` | 7 (auth guards) |
| `tests/queue/queues.test.ts` | +2 wallet queue |

**Total:** 231 tests passing (up from 214)

---

## Quality Gate

```bash
npm run lint        # ✅
npm run typecheck   # ✅
npm test            # ✅ 231/231
npm run build       # ✅
```

---

## Minimal Cross-Module Changes

| Module | Change |
|--------|--------|
| `payments/service` | `creditHostEarningsFromPayment()` after capture; `reverseHostEarningsFromPayment()` after admin refund |
| `payments/events/payments.queue.ts` | `SCHEDULE_SETTLEMENT` calls wallet settlement |
| `routes/index.ts` | Register `/wallet` + `/admin/payouts` routers |
| `server.ts` | Wallet BullMQ worker boot/shutdown |
| `shared/cache/redis-cache-policy.ts` | `walletSummary` key + invalidation pattern |
| `docs/openapi.ts` | Wallet paths |

---

## Deferred (Out of Scope)

- Notifications module (domain event stubs only)
- Reviews module
- Automated bank account verification (KYC integration)
- Razorpay X / external payout disbursement API
- Push/email on withdrawal status change

---

**STOP — awaiting approval before next phase (Notifications / Reviews).**
