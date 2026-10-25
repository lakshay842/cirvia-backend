# DATABASE_DESIGN.md (Part 2)

# Host & Event System

Version: 1.0

---

# HOST_PROFILES

Purpose

Verified users who can create and manage events.

Columns

id

user_id (FK users)

display_name

bio

host_since

verification_status

host_rating

total_reviews

total_events

total_guests

completed_events

response_rate

response_time

languages

is_featured

created_at

updated_at

Indexes

user_id UNIQUE

verification_status

host_rating

is_featured

---

# HOST_ADDRESSES

Purpose

Host address for verification.

Columns

id

host_id

address_line_1

address_line_2

landmark

city

state

country

postal_code

latitude

longitude

is_verified

created_at

updated_at

---

# HOST_BANK_ACCOUNTS

Purpose

Host payouts.

Columns

id

host_id

account_holder_name

bank_name

account_number (encrypted)

ifsc_code

upi_id

is_primary

verification_status

created_at

updated_at

---

# HOST_PAYOUTS

Columns

id

host_id

wallet_transaction_id

amount

status

requested_at

processed_at

transaction_reference

---

# CATEGORIES

Purpose

Master event categories.

Columns

id

name

slug

icon

description

is_active

sort_order

created_at

updated_at

Default Categories

House Gathering

Coffee Meetup

Movie Night

Networking

Board Games

Workshop

Music Session

Birthday Meetup

Sports Watch Party

Community Meetup

---

# EVENTS

Purpose

Main event table.

Columns

id

host_id

category_id

title

slug

description

short_description

status

visibility

approval_required

minimum_age

maximum_age

language

capacity

remaining_capacity

price

currency

booking_start

booking_end

event_start

event_end

dress_code

food_provided

parking_available

pets_allowed

smoking_allowed

created_at

updated_at

deleted_at

Indexes

host_id

category_id

status

visibility

event_start

city

price

---

# EVENT_LOCATIONS

Purpose

Store venue details.

Columns

id

event_id

venue_name

address_line_1

address_line_2

city

state

country

postal_code

latitude

longitude

google_place_id

map_url

is_private_address

---

# EVENT_MEDIA

Purpose

Images and videos.

Columns

id

event_id

media_type

file_url

thumbnail_url

sort_order

is_cover

uploaded_by

created_at

Media Types

IMAGE

VIDEO

---

# EVENT_RULES

Purpose

Host-defined rules.

Columns

id

event_id

title

description

display_order

Examples

No Smoking

Respect Everyone

No Recording

Bring Valid ID

---

# EVENT_TAGS

Columns

id

name

slug

---

# EVENT_TAG_MAPPING

Columns

id

event_id

tag_id

---

# EVENT_AGENDA

Purpose

Optional schedule.

Columns

id

event_id

title

description

start_time

end_time

sort_order

---

# EVENT_BOOKINGS

Purpose

Core booking table.

Columns

id

event_id

user_id

booking_reference

booking_status

payment_status

ticket_type

ticket_price

currency

guests_count

approval_status

approved_by

approved_at

cancelled_at

completed_at

created_at

updated_at

Statuses

Requested

Pending

Approved

Rejected

Cancelled

Completed

No Show

Indexes

event_id

user_id

booking_status

payment_status

---

# BOOKING_ATTENDEES

Purpose

Multiple attendees under one booking.

Columns

id

booking_id

user_id (nullable)

guest_name

guest_email

guest_phone

verification_status

checked_in

checked_out

created_at

---

# BOOKING_WAITLIST

Purpose

Queue when event is full.

Columns

id

event_id

user_id

position

status

joined_at

notified_at

---

# BOOKING_QR_CODES

Purpose

Digital tickets.

Columns

id

booking_id

qr_code

expires_at

checked_in_at

checked_out_at

scanned_by

---

# EVENT_INVITATIONS

Purpose

Invite-only events.

Columns

id

event_id

invited_by

user_id

email

status

sent_at

accepted_at

---

# EVENT_CO_HOSTS

Purpose

Multiple organizers.

Columns

id

event_id

host_id

role

permissions

created_at

---

# EVENT_FAVORITES

Purpose

Saved events.

Columns

id

user_id

event_id

created_at

Unique Constraint

One user can save an event only once.

---

# EVENT_VIEWS

Purpose

Analytics.

Columns

id

event_id

user_id (nullable)

device_id

ip_address

viewed_at

---

# EVENT_SHARE_HISTORY

Purpose

Track shares.

Columns

id

event_id

shared_by

platform

created_at

Platforms

WhatsApp

Instagram

Facebook

LinkedIn

Copy Link

---

# EVENT_REPORTS

Purpose

Event moderation.

Columns

id

event_id

reported_by

reason

description

status

reviewed_by

reviewed_at

---

# RELATIONSHIP FLOW

User

↓

Host Profile

↓

Event

↓

Location

↓

Media

↓

Rules

↓

Bookings

↓

Attendees

↓

QR Code

↓

Reviews

---

# CONSTRAINTS

One Host → Many Events

One Event → One Location

One Event → Many Media

One Event → Many Bookings

One Booking → One QR Code

One User → One Booking Per Event

Capacity cannot become negative.

Booking closes after booking_end.

---

# INDEX STRATEGY

Create indexes on

host_id

category_id

event_start

booking_status

approval_status

city

latitude

longitude

visibility

status

price

---

# FUTURE READY

Support

Recurring Events

Series Events

Community Groups

Organization Hosts

Corporate Events

Brand Events

Team Organizers

Membership-only Events

Geo-fenced Events

Live Streaming

Hybrid Events

---

# NEXT MODULE

DATABASE_DESIGN.md (Part 3)

Payments

Wallet

Invoices

Coupons

Reviews

Trust Score

Notifications

Reports

Admin

Audit Logs

Analytics
