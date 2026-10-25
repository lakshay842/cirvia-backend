# API_CONTRACT.md

# Part 2

## Host Module

## Event Module

## Category Module

## Media Module

Version

1.0

Base URL

```text
/api/v1
```

---

# HOST MODULE

---

## Become Host

POST

```http
/api/v1/hosts/apply
```

Authorization

Bearer Token

Request

```json
{
  "bio": "",
  "experience": "",
  "languages": ["English", "Hindi"],
  "address": {
    "addressLine1": "",
    "city": "",
    "state": "",
    "country": "",
    "postalCode": ""
  },
  "emergencyContact": {
    "name": "",
    "phone": ""
  }
}
```

Response

```json
{
  "success": true,
  "message": "Host application submitted."
}
```

---

## Get Host Profile

GET

```http
/api/v1/hosts/me
```

---

## Update Host Profile

PATCH

```http
/api/v1/hosts/me
```

---

## Upload Host Documents

POST

```http
/api/v1/hosts/documents
```

Multipart Form Data

Files

* Identity Proof
* Address Proof

---

## Get Host Verification Status

GET

```http
/api/v1/hosts/verification-status
```

---

## HOST EVENTS

---

## Get My Events

GET

```http
/api/v1/hosts/events
```

Query

```text
?page=1

&limit=20

&status=published
```

---

## Create Event

POST

```http
/api/v1/events
```

Authorization

Bearer Token

Request

```json
{
  "title": "",
  "description": "",
  "categoryId": "",
  "capacity": 20,
  "price": 499,
  "visibility": "PUBLIC",
  "approvalRequired": true,
  "minimumAge": 18,
  "eventDate": "",
  "startTime": "",
  "endTime": "",
  "location": {},
  "rules": [],
  "tags": []
}
```

Response

```json
{
  "success": true,
  "eventId": "",
  "message": "Event created successfully."
}
```

---

## Update Event

PATCH

```http
/api/v1/events/:eventId
```

---

## Delete Event

DELETE

```http
/api/v1/events/:eventId
```

Soft Delete

---

## Publish Event

PATCH

```http
/api/v1/events/:eventId/publish
```

---

## Unpublish Event

PATCH

```http
/api/v1/events/:eventId/unpublish
```

---

## Duplicate Event

POST

```http
/api/v1/events/:eventId/duplicate
```

---

## Cancel Event

PATCH

```http
/api/v1/events/:eventId/cancel
```

Reason required.

---

# EVENT DISCOVERY

---

## Get Events

GET

```http
/api/v1/events
```

Query Parameters

```text
page

limit

city

category

priceType

date

radius

latitude

longitude

verifiedHost

search

sort
```

Sort

Newest

Nearest

Trending

Highest Rated

Lowest Price

---

## Get Event Details

GET

```http
/api/v1/events/:slug
```

---

## Get Featured Events

GET

```http
/api/v1/events/featured
```

---

## Get Trending Events

GET

```http
/api/v1/events/trending
```

---

## Get Nearby Events

GET

```http
/api/v1/events/nearby
```

Requires

Latitude

Longitude

Radius

---

## Search Events

GET

```http
/api/v1/events/search
```

Query

```text
keyword

city

category

date
```

---

## CATEGORY MODULE

---

## Get Categories

GET

```http
/api/v1/categories
```

---

## Get Category Details

GET

```http
/api/v1/categories/:slug
```

---

## EVENT MEDIA

---

## Upload Event Images

POST

```http
/api/v1/events/:eventId/media
```

Multipart

Supports

Images

Videos

---

## Delete Media

DELETE

```http
/api/v1/events/media/:mediaId
```

---

## Reorder Media

PATCH

```http
/api/v1/events/:eventId/media/order
```

Request

```json
{
  "media": [
    {
      "id": "",
      "order": 1
    }
  ]
}
```

---

# EVENT LOCATION

---

## Update Location

PATCH

```http
/api/v1/events/:eventId/location
```

---

## Get Event Map

GET

```http
/api/v1/events/:eventId/location
```

---

# EVENT RULES

---

## Add Rule

POST

```http
/api/v1/events/:eventId/rules
```

---

## Update Rule

PATCH

```http
/api/v1/events/:eventId/rules/:ruleId
```

---

## Delete Rule

DELETE

```http
/api/v1/events/:eventId/rules/:ruleId
```

---

# EVENT TAGS

---

## Add Tags

POST

```http
/api/v1/events/:eventId/tags
```

---

## Remove Tag

DELETE

```http
/api/v1/events/:eventId/tags/:tagId
```

---

# HOST ANALYTICS

---

## Dashboard Summary

GET

```http
/api/v1/hosts/dashboard
```

Returns

* Total Events
* Upcoming Events
* Revenue
* Bookings
* Rating
* Pending Requests

---

## Revenue Analytics

GET

```http
/api/v1/hosts/revenue
```

Supports

Daily

Weekly

Monthly

Yearly

---

## Event Analytics

GET

```http
/api/v1/hosts/events/:eventId/analytics
```

Returns

Views

Bookings

Attendance

Revenue

Conversion Rate

---

# VALIDATION RULES

* Event title required.
* Description minimum length.
* Capacity > 0.
* Minimum age >= 18.
* End time must be after start time.
* Event date cannot be in the past.
* Maximum upload size enforced.
* Only verified hosts can publish public events.

---

# AUTHORIZATION

Guest

* View public events.
* View categories.

User

* Save events.
* Request booking.

Verified User

* Join events.
* Leave reviews.

Host

* Create events.
* Manage events.
* View bookings.

Admin

* Moderate events.
* Suspend events.
* Feature events.

---

# ERROR CODES

EVENT_NOT_FOUND

HOST_NOT_VERIFIED

CATEGORY_NOT_FOUND

MEDIA_UPLOAD_FAILED

EVENT_FULL

EVENT_CANCELLED

INVALID_EVENT_DATE

UNAUTHORIZED_ACTION

VALIDATION_ERROR
