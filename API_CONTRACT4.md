# API_CONTRACT.md

# Part 4

## Reviews Module

## Notifications Module

## Reports Module

## Support Module

## Trust Score Module

Version

1.0

Base URL

```text
/api/v1
```

---

# REVIEW MODULE

---

## Submit Event Review

POST

```http
/api/v1/reviews/event
```

Authorization

Bearer Token

Request

```json
{
  "bookingId": "uuid",
  "rating": 5,
  "title": "Amazing Event",
  "comment": "Everything was perfectly organized.",
  "wouldRecommend": true
}
```

Response

```json
{
  "success": true,
  "message": "Review submitted successfully."
}
```

Business Rules

* Booking must be Completed.
* Only one review per booking.
* Rating between 1–5.

---

## Submit Host Review

POST

```http
/api/v1/reviews/host
```

---

## Submit Guest Review

POST

```http
/api/v1/reviews/guest
```

---

## Update Review

PATCH

```http
/api/v1/reviews/:reviewId
```

Allowed only within 24 hours.

---

## Delete Review

DELETE

```http
/api/v1/reviews/:reviewId
```

Soft Delete

---

## Get Event Reviews

GET

```http
/api/v1/events/:eventId/reviews
```

Query

```text
?page=1
&limit=20
&rating=5
&sort=latest
```

---

## Get Host Reviews

GET

```http
/api/v1/hosts/:hostId/reviews
```

---

## Get My Reviews

GET

```http
/api/v1/users/me/reviews
```

---

# NOTIFICATION MODULE

---

## Get Notifications

GET

```http
/api/v1/notifications
```

Query

```text
?page=1
&limit=20
&type=booking
```

---

## Notification Details

GET

```http
/api/v1/notifications/:notificationId
```

---

## Mark As Read

PATCH

```http
/api/v1/notifications/:notificationId/read
```

---

## Mark All Read

PATCH

```http
/api/v1/notifications/read-all
```

---

## Delete Notification

DELETE

```http
/api/v1/notifications/:notificationId
```

---

## Notification Preferences

GET

```http
/api/v1/notifications/preferences
```

---

## Update Preferences

PATCH

```http
/api/v1/notifications/preferences
```

Request

```json
{
  "email": true,
  "push": true,
  "marketing": false,
  "booking": true,
  "security": true
}
```

---

# REPORT MODULE

---

## Report User

POST

```http
/api/v1/reports/user
```

Request

```json
{
  "userId": "uuid",
  "reason": "Spam",
  "description": "Sending abusive messages."
}
```

---

## Report Event

POST

```http
/api/v1/reports/event
```

---

## Report Host

POST

```http
/api/v1/reports/host
```

---

## Report Review

POST

```http
/api/v1/reports/review
```

---

## Get My Reports

GET

```http
/api/v1/reports
```

---

## Report Status

GET

```http
/api/v1/reports/:reportId
```

---

# SUPPORT MODULE

---

## Create Ticket

POST

```http
/api/v1/support/tickets
```

Request

```json
{
  "subject": "",
  "category": "Payment",
  "message": ""
}
```

---

## My Tickets

GET

```http
/api/v1/support/tickets
```

---

## Ticket Details

GET

```http
/api/v1/support/tickets/:ticketId
```

---

## Reply Ticket

POST

```http
/api/v1/support/tickets/:ticketId/messages
```

---

## Close Ticket

PATCH

```http
/api/v1/support/tickets/:ticketId/close
```

---

# TRUST SCORE MODULE

---

## Get Trust Score

GET

```http
/api/v1/trust-score
```

Response

```json
{
  "score": 84,
  "level": "Highly Trusted",
  "history": []
}
```

---

## Trust Score History

GET

```http
/api/v1/trust-score/history
```

---

## Trust Factors

GET

```http
/api/v1/trust-score/factors
```

Returns

* Verified Identity
* Completed Events
* Reviews
* Reports
* No Shows
* Profile Completion

---

# USER ACTIVITY

---

## Activity Feed

GET

```http
/api/v1/activity
```

---

## Public Activity

GET

```http
/api/v1/users/:username/activity
```

---

# SAVED EVENTS

---

## Save Event

POST

```http
/api/v1/events/:eventId/save
```

---

## Remove Saved Event

DELETE

```http
/api/v1/events/:eventId/save
```

---

## My Saved Events

GET

```http
/api/v1/users/me/saved-events
```

---

# FOLLOW SYSTEM

---

## Follow User

POST

```http
/api/v1/users/:userId/follow
```

---

## Unfollow User

DELETE

```http
/api/v1/users/:userId/follow
```

---

## Followers

GET

```http
/api/v1/users/:userId/followers
```

---

## Following

GET

```http
/api/v1/users/:userId/following
```

---

# BUSINESS RULES

* Reviews allowed only after completed events.
* Users cannot report themselves.
* Duplicate reports for the same entity are blocked.
* Trust score recalculates automatically after reviews, reports, verification changes, and attendance updates.
* Notification preferences apply to all outgoing notifications except mandatory security alerts.
* Closed support tickets become read-only.

---

# ERROR CODES

REVIEW_ALREADY_EXISTS

BOOKING_NOT_COMPLETED

REPORT_ALREADY_SUBMITTED

NOTIFICATION_NOT_FOUND

TICKET_CLOSED

INVALID_RATING

TRUST_SCORE_UNAVAILABLE

FOLLOW_NOT_ALLOWED

UNAUTHORIZED_ACTION
