# API_CONTRACT.md

# Part 5

## Admin Module

## CMS Module

## Analytics Module

## Moderation Module

## Feature Flags

Version

1.0

Base URL

```text
/api/v1/admin
```

Authentication

Bearer JWT

Role Required

ADMIN

SUPER_ADMIN

MODERATOR (limited endpoints)

---

# ADMIN DASHBOARD

---

## Dashboard Summary

GET

```http
/api/v1/admin/dashboard
```

Returns

```json
{
  "users": {},
  "hosts": {},
  "events": {},
  "bookings": {},
  "payments": {},
  "revenue": {},
  "reports": {}
}
```

---

## Platform Statistics

GET

```http
/api/v1/admin/statistics
```

Query

```text
period=daily

weekly

monthly

yearly
```

---

# USER MANAGEMENT

---

## Get Users

GET

```http
/api/v1/admin/users
```

Query

```text
page

limit

search

status

city

verified

role
```

---

## User Details

GET

```http
/api/v1/admin/users/:userId
```

---

## Update User

PATCH

```http
/api/v1/admin/users/:userId
```

---

## Suspend User

PATCH

```http
/api/v1/admin/users/:userId/suspend
```

---

## Ban User

PATCH

```http
/api/v1/admin/users/:userId/ban
```

---

## Restore User

PATCH

```http
/api/v1/admin/users/:userId/restore
```

---

## Delete User (Soft Delete)

DELETE

```http
/api/v1/admin/users/:userId
```

---

# HOST MANAGEMENT

---

## Get Hosts

GET

```http
/api/v1/admin/hosts
```

---

## Host Details

GET

```http
/api/v1/admin/hosts/:hostId
```

---

## Approve Host

PATCH

```http
/api/v1/admin/hosts/:hostId/approve
```

---

## Reject Host

PATCH

```http
/api/v1/admin/hosts/:hostId/reject
```

---

## Suspend Host

PATCH

```http
/api/v1/admin/hosts/:hostId/suspend
```

---

# VERIFICATION

---

## Pending KYC

GET

```http
/api/v1/admin/verifications
```

---

## Verification Details

GET

```http
/api/v1/admin/verifications/:verificationId
```

---

## Approve Verification

PATCH

```http
/api/v1/admin/verifications/:verificationId/approve
```

---

## Reject Verification

PATCH

```http
/api/v1/admin/verifications/:verificationId/reject
```

Request

```json
{
  "reason": "Document is blurry"
}
```

---

# EVENT MODERATION

---

## Pending Events

GET

```http
/api/v1/admin/events/pending
```

---

## Event Details

GET

```http
/api/v1/admin/events/:eventId
```

---

## Approve Event

PATCH

```http
/api/v1/admin/events/:eventId/approve
```

---

## Reject Event

PATCH

```http
/api/v1/admin/events/:eventId/reject
```

---

## Feature Event

PATCH

```http
/api/v1/admin/events/:eventId/feature
```

---

## Remove Featured Event

PATCH

```http
/api/v1/admin/events/:eventId/unfeature
```

---

# REPORT MANAGEMENT

---

## Get Reports

GET

```http
/api/v1/admin/reports
```

Query

```text
status

category

priority

page

limit
```

---

## Report Details

GET

```http
/api/v1/admin/reports/:reportId
```

---

## Resolve Report

PATCH

```http
/api/v1/admin/reports/:reportId/resolve
```

---

## Dismiss Report

PATCH

```http
/api/v1/admin/reports/:reportId/dismiss
```

---

# PAYMENT MANAGEMENT

---

## Payment List

GET

```http
/api/v1/admin/payments
```

---

## Payment Details

GET

```http
/api/v1/admin/payments/:paymentId
```

---

## Refund Payment

POST

```http
/api/v1/admin/payments/:paymentId/refund
```

---

## Payout Requests

GET

```http
/api/v1/admin/payouts
```

---

## Approve Payout

PATCH

```http
/api/v1/admin/payouts/:payoutId/approve
```

---

## Reject Payout

PATCH

```http
/api/v1/admin/payouts/:payoutId/reject
```

---

# CMS

---

## CMS Pages

GET

```http
/api/v1/admin/cms/pages
```

---

## Create Page

POST

```http
/api/v1/admin/cms/pages
```

---

## Update Page

PATCH

```http
/api/v1/admin/cms/pages/:pageId
```

---

## Delete Page

DELETE

```http
/api/v1/admin/cms/pages/:pageId
```

---

## Homepage Banners

GET

```http
/api/v1/admin/cms/banners
```

---

## Create Banner

POST

```http
/api/v1/admin/cms/banners
```

---

## Update Banner

PATCH

```http
/api/v1/admin/cms/banners/:bannerId
```

---

## Delete Banner

DELETE

```http
/api/v1/admin/cms/banners/:bannerId
```

---

# FAQ

GET

POST

PATCH

DELETE

```http
/api/v1/admin/faqs
```

---

# EMAIL TEMPLATES

GET

PATCH

```http
/api/v1/admin/email-templates
```

---

# PUSH TEMPLATES

GET

PATCH

```http
/api/v1/admin/push-templates
```

---

# ANALYTICS

---

## Revenue Analytics

GET

```http
/api/v1/admin/analytics/revenue
```

---

## User Growth

GET

```http
/api/v1/admin/analytics/users
```

---

## Host Growth

GET

```http
/api/v1/admin/analytics/hosts
```

---

## Booking Analytics

GET

```http
/api/v1/admin/analytics/bookings
```

---

## Event Analytics

GET

```http
/api/v1/admin/analytics/events
```

---

## Trust Score Analytics

GET

```http
/api/v1/admin/analytics/trust
```

---

## Report Analytics

GET

```http
/api/v1/admin/analytics/reports
```

---

## Export CSV

GET

```http
/api/v1/admin/export
```

Query

```text
module

from

to

format
```

Formats

CSV

Excel

PDF

---

# FEATURE FLAGS

---

## Get Features

GET

```http
/api/v1/admin/features
```

---

## Enable Feature

PATCH

```http
/api/v1/admin/features/:featureId/enable
```

---

## Disable Feature

PATCH

```http
/api/v1/admin/features/:featureId/disable
```

---

# SYSTEM SETTINGS

---

## Get Settings

GET

```http
/api/v1/admin/settings
```

---

## Update Settings

PATCH

```http
/api/v1/admin/settings
```

---

# AUDIT LOGS

---

## Get Logs

GET

```http
/api/v1/admin/audit-logs
```

---

## Admin Activity

GET

```http
/api/v1/admin/activity
```

---

# BUSINESS RULES

* Every admin action creates an audit log.
* Refund approvals require Finance Admin or Super Admin permissions.
* KYC approvals require Moderator or Admin permissions.
* Feature flags take effect without requiring application restart where possible.
* Deleted CMS pages are soft-deleted and recoverable.
* Analytics endpoints are read-only.
* CSV/Excel/PDF exports respect user permissions and filters.

---

# ERROR CODES

USER_NOT_FOUND

HOST_NOT_FOUND

VERIFICATION_NOT_FOUND

REPORT_NOT_FOUND

PAYMENT_NOT_FOUND

PAYOUT_NOT_FOUND

FEATURE_NOT_FOUND

CMS_PAGE_NOT_FOUND

INSUFFICIENT_PERMISSIONS

EXPORT_FAILED
