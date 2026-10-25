# API_CONTRACT.md

# Part 6

## Global API Standards

## Pagination

## Filtering

## Sorting

## Search

## Versioning

## Rate Limiting

## Webhooks

## Real-time Events

Version

1.0

---

# API VERSIONING

Current Version

```text
/api/v1
```

Future

```text
/api/v2
```

Breaking changes must only be introduced in a new API version.

---

# HTTP METHODS

GET

Read

POST

Create

PATCH

Partial Update

PUT

Replace

DELETE

Soft Delete

---

# STANDARD SUCCESS RESPONSE

```json
{
  "success": true,
  "message": "Request successful.",
  "data": {},
  "meta": {}
}
```

---

# STANDARD ERROR RESPONSE

```json
{
  "success": false,
  "message": "Validation failed.",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

---

# PAGINATION

Request

```text
?page=1
&limit=20
```

Response

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 230,
    "totalPages": 12,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

# CURSOR PAGINATION

Large datasets

```text
?cursor=eyJpZCI6IjEyMyJ9
&limit=20
```

Use for

Notifications

Activity

Messages (Future)

Audit Logs

---

# SORTING

Example

```text
?sort=createdAt
&order=desc
```

Allowed

asc

desc

---

# FILTERING

Example

```text
?status=approved

&category=networking

&city=Noida

&priceType=free

&verified=true
```

---

# SEARCH

Example

```text
?search=coffee meetup
```

Supports

Title

Description

Host

Category

City

Tags

---

# FIELD SELECTION

Example

```text
?fields=id,title,price,eventDate
```

---

# INCLUDE RELATIONS

Example

```text
?include=host,reviews,location
```

---

# DATE FILTERS

```text
?from=2026-07-01

&to=2026-07-31
```

---

# STATUS CODES

200

OK

201

Created

202

Accepted

204

No Content

400

Bad Request

401

Unauthorized

403

Forbidden

404

Not Found

409

Conflict

422

Validation Error

429

Too Many Requests

500

Internal Server Error

503

Maintenance

---

# ERROR CODES

AUTH_REQUIRED

TOKEN_EXPIRED

TOKEN_INVALID

VALIDATION_ERROR

ACCESS_DENIED

RESOURCE_NOT_FOUND

DUPLICATE_RESOURCE

RATE_LIMIT_EXCEEDED

PAYMENT_FAILED

REFUND_FAILED

HOST_NOT_VERIFIED

EVENT_FULL

BOOKING_EXISTS

INVALID_QR

UNKNOWN_ERROR

---

# VALIDATION

All requests validated with

Zod

Reject unknown properties.

Sanitize strings.

Validate UUID format.

Validate dates.

Validate file types.

---

# FILE UPLOADS

Content-Type

```text
multipart/form-data
```

Supported

Images

PDF

Maximum

10 MB

Storage

AWS S3

Response

```json
{
  "url": "",
  "key": ""
}
```

---

# AUTHENTICATION

Bearer JWT

Example

```text
Authorization: Bearer <access_token>
```

Refresh Token Rotation required.

---

# AUTHORIZATION

Roles

Guest

User

Verified User

Host

Moderator

Admin

Super Admin

Every endpoint must declare required roles.

---

# RATE LIMITING

Authentication

10 requests / minute

Search

60 requests / minute

Booking

20 requests / minute

Payments

10 requests / minute

Admin

120 requests / minute

General API

100 requests / minute

---

# IDEMPOTENCY

Required for

Payments

Refunds

Bookings

Header

```text
Idempotency-Key
```

Duplicate requests must return the same result.

---

# CACHING

Cache

Categories

Cities

Featured Events

Trending Events

Cache-Control headers must be used where appropriate.

---

# WEBHOOKS

Events

payment.success

payment.failed

refund.completed

booking.created

booking.cancelled

host.approved

verification.approved

notification.sent

Payload

```json
{
  "event": "",
  "timestamp": "",
  "data": {}
}
```

---

# REAL-TIME EVENTS

Use WebSockets or SSE.

Events

booking.updated

notification.created

host.approved

payment.completed

event.cancelled

trust-score.updated

---

# API SECURITY

HTTPS only.

JWT required for protected routes.

Refresh Token rotation.

Password hashing (bcrypt/Argon2).

Helmet.

CORS.

Rate limiting.

Input sanitization.

File validation.

Role-based authorization.

Audit logging.

---

# RESPONSE HEADERS

Include

Request-Id

Trace-Id

API-Version

RateLimit-Limit

RateLimit-Remaining

---

# REQUEST ID

Every request receives a unique Request ID.

Useful for

Logging

Tracing

Support

Debugging

---

# OBSERVABILITY

Log

Errors

Latency

Request duration

Status codes

User ID (when authenticated)

Request ID

Never log

Passwords

OTP

JWT

KYC document contents

Card details

---

# DEPRECATION POLICY

Deprecated endpoints remain available for one major version.

Response Header

```text
Deprecation: true
Sunset: <date>
```

---

# API DOCUMENTATION

Maintain OpenAPI 3.1 specification.

Generate Swagger UI automatically.

Keep request/response schemas synchronized with implementation.

---

# TESTING

Every endpoint should include:

* Success test
* Validation failure test
* Unauthorized test
* Forbidden test
* Not Found test
* Rate limit test
* Edge case test

---

# PERFORMANCE TARGETS

Average response

< 200 ms

95th percentile

< 500 ms

File uploads

Background processing where possible.

---

# FINAL API PRINCIPLES

* Consistent request and response formats.
* Predictable error handling.
* Strong validation.
* Secure by default.
* Versioned APIs.
* Idempotent financial operations.
* Pagination for collections.
* Typed contracts.
* Backward compatibility whenever possible.
* API documentation is the source of truth.
