# API_CONTRACT.md

# Part 3

## Booking Module

## Payment Module

## Wallet Module

## QR Check-in Module

Version

1.0

Base URL

```text
/api/v1
```

---

# BOOKING MODULE

---

## Create Booking

POST

```http
/api/v1/bookings
```

Authorization

Bearer Token

Request

```json
{
  "eventId": "uuid",
  "ticketQuantity": 2,
  "couponCode": "WELCOME100"
}
```

Response

```json
{
  "success": true,
  "message": "Booking created successfully.",
  "data": {
    "bookingId": "uuid",
    "bookingReference": "BK-2026-000123",
    "status": "PENDING_PAYMENT"
  }
}
```

---

## Get My Bookings

GET

```http
/api/v1/bookings
```

Query

```text
?page=1
&limit=20
&status=upcoming
```

---

## Booking Details

GET

```http
/api/v1/bookings/:bookingId
```

---

## Cancel Booking

PATCH

```http
/api/v1/bookings/:bookingId/cancel
```

Request

```json
{
  "reason": "Unable to attend"
}
```

---

## Request Cancellation

POST

```http
/api/v1/bookings/:bookingId/cancellation-request
```

---

## Join Waitlist

POST

```http
/api/v1/bookings/waitlist
```

Request

```json
{
  "eventId": "uuid"
}
```

---

## Leave Waitlist

DELETE

```http
/api/v1/bookings/waitlist/:waitlistId
```

---

## PAYMENT MODULE

---

## Create Payment Order

POST

```http
/api/v1/payments/order
```

Request

```json
{
  "bookingId": "uuid"
}
```

Response

```json
{
  "orderId": "",
  "amount": 999,
  "currency": "INR",
  "gateway": "razorpay"
}
```

---

## Verify Payment

POST

```http
/api/v1/payments/verify
```

Request

```json
{
  "orderId": "",
  "paymentId": "",
  "signature": ""
}
```

---

## Payment History

GET

```http
/api/v1/payments
```

---

## Payment Details

GET

```http
/api/v1/payments/:paymentId
```

---

## Download Invoice

GET

```http
/api/v1/payments/:paymentId/invoice
```

Returns PDF.

---

## Refund Request

POST

```http
/api/v1/payments/:paymentId/refund
```

Request

```json
{
  "reason": "Host cancelled event"
}
```

---

## Refund Status

GET

```http
/api/v1/payments/:paymentId/refund-status
```

---

# COUPON MODULE

---

## Validate Coupon

POST

```http
/api/v1/coupons/validate
```

Request

```json
{
  "couponCode": "WELCOME100",
  "eventId": "uuid"
}
```

---

## Apply Coupon

POST

```http
/api/v1/coupons/apply
```

---

## Remove Coupon

DELETE

```http
/api/v1/coupons/remove
```

---

# WALLET MODULE

---

## Wallet Summary

GET

```http
/api/v1/wallet
```

Returns

* Available Balance
* Pending Balance
* Lifetime Earnings
* Withdrawals

---

## Wallet Transactions

GET

```http
/api/v1/wallet/transactions
```

Query

```text
?page
limit
type
```

---

## Request Withdrawal

POST

```http
/api/v1/wallet/withdraw
```

Request

```json
{
  "amount": 5000,
  "bankAccountId": "uuid"
}
```

---

## Withdrawal History

GET

```http
/api/v1/wallet/withdrawals
```

---

## BANK ACCOUNT

---

## Add Bank Account

POST

```http
/api/v1/wallet/bank-accounts
```

---

## Update Bank Account

PATCH

```http
/api/v1/wallet/bank-accounts/:id
```

---

## Delete Bank Account

DELETE

```http
/api/v1/wallet/bank-accounts/:id
```

---

# QR CHECK-IN MODULE

---

## Generate QR Ticket

GET

```http
/api/v1/bookings/:bookingId/qr
```

---

## Scan QR

POST

```http
/api/v1/check-in/scan
```

Request

```json
{
  "qrCode": "encrypted-string"
}
```

---

## Check-in User

POST

```http
/api/v1/check-in
```

Request

```json
{
  "bookingId": "uuid"
}
```

---

## Check-out User

POST

```http
/api/v1/check-out
```

---

## Attendance List

GET

```http
/api/v1/events/:eventId/attendance
```

---

# HOST BOOKING MANAGEMENT

---

## Booking Requests

GET

```http
/api/v1/hosts/bookings
```

---

## Approve Booking

PATCH

```http
/api/v1/hosts/bookings/:bookingId/approve
```

---

## Reject Booking

PATCH

```http
/api/v1/hosts/bookings/:bookingId/reject
```

---

## Guest List

GET

```http
/api/v1/events/:eventId/guests
```

---

# BUSINESS RULES

* User cannot book the same event twice.
* Booking closes after booking end date.
* QR is generated only after successful payment.
* Refund policy follows host settings.
* Host cannot approve bookings after event starts.
* Wallet payout starts only after event completion.
* Withdrawals require verified bank details.

---

# ERROR CODES

BOOKING_ALREADY_EXISTS

EVENT_FULL

WAITLIST_JOINED

PAYMENT_FAILED

PAYMENT_NOT_VERIFIED

REFUND_NOT_ALLOWED

INVALID_QR

BOOKING_CANCELLED

WITHDRAWAL_LIMIT_EXCEEDED

BANK_ACCOUNT_NOT_VERIFIED

---

# AUTHORIZATION

Guest

* No booking access.

User

* Book event.
* Pay.
* Cancel own booking.
* View own bookings.

Host

* Manage bookings.
* Approve or reject requests.
* Scan QR.
* View attendance.

Admin

* View all bookings.
* Force refund.
* Resolve payment disputes.
