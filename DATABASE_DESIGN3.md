# DATABASE_DESIGN.md (Part 3)

# Payments, Wallet, Reviews, Trust & Notifications

Version: 1.0

---

# PAYMENTS

Purpose

Master payment record.

Columns

id

booking_id

user_id

host_id

gateway

gateway_transaction_id

payment_reference

amount

platform_fee

tax_amount

discount_amount

net_amount

currency

payment_status

payment_method

paid_at

failed_at

failure_reason

created_at

updated_at

Indexes

booking_id

user_id

host_id

payment_status

paid_at

---

Payment Status

Pending

Authorized

Captured

Failed

Refunded

Partially Refunded

Cancelled

---

# PAYMENT_TRANSACTIONS

Purpose

Track every gateway transaction.

Columns

id

payment_id

transaction_type

gateway_reference

amount

status

request_payload

response_payload

processed_at

created_at

---

Transaction Types

Payment

Refund

Payout

Adjustment

Chargeback

---

# REFUNDS

Columns

id

payment_id

booking_id

requested_by

approved_by

reason

refund_amount

status

gateway_reference

requested_at

processed_at

---

# WALLETS

Purpose

Host wallet.

Columns

id

user_id

available_balance

pending_balance

lifetime_earnings

lifetime_withdrawals

currency

created_at

updated_at

---

# WALLET_TRANSACTIONS

Columns

id

wallet_id

payment_id

type

amount

balance_before

balance_after

reference

description

created_at

---

Transaction Types

Credit

Debit

Refund

Commission

Withdrawal

Adjustment

---

# COUPONS

Columns

id

code

title

description

discount_type

discount_value

minimum_booking_amount

maximum_discount

usage_limit

used_count

valid_from

valid_until

status

---

# COUPON_USAGE

Columns

id

coupon_id

user_id

booking_id

discount_amount

used_at

---

# INVOICES

Columns

id

payment_id

invoice_number

invoice_url

gst_number

billing_name

billing_address

generated_at

---

# HOST_REVIEWS

Purpose

Guest reviews host.

Columns

id

booking_id

event_id

host_id

reviewer_id

rating

title

comment

would_recommend

created_at

---

# GUEST_REVIEWS

Purpose

Host reviews guest.

Columns

id

booking_id

host_id

guest_id

rating

comment

created_at

---

# EVENT_REVIEWS

Purpose

Review overall event.

Columns

id

booking_id

event_id

user_id

rating

comment

created_at

---

Constraints

One review per booking.

Only completed bookings can create reviews.

---

# TRUST_SCORES

Purpose

Current trust score snapshot.

Columns

id

user_id

score

level

verified_identity

completed_events

positive_reviews

negative_reports

last_updated

---

Trust Levels

Restricted

Basic

Trusted

Highly Trusted

Elite

---

# TRUST_SCORE_HISTORY

Purpose

Every score change.

Columns

id

user_id

old_score

new_score

reason

changed_by

created_at

---

Reasons

Completed Event

Positive Review

No Show

Report

Verification Approved

Account Suspension

---

# NOTIFICATIONS

Purpose

All user notifications.

Columns

id

user_id

type

title

message

data_json

priority

is_read

read_at

sent_at

created_at

---

Notification Types

Booking

Payment

Refund

Verification

Reminder

Promotion

Security

Support

Review

Trust Score

---

# NOTIFICATION_PREFERENCES

Columns

id

user_id

email_enabled

push_enabled

sms_enabled

marketing_enabled

security_enabled

booking_enabled

review_enabled

---

# REPORTS

Purpose

Reports against users or events.

Columns

id

reporter_id

reported_user_id

reported_event_id

category

reason

description

status

assigned_to

resolution

created_at

resolved_at

---

Report Categories

Spam

Harassment

Fake Profile

Unsafe Behaviour

Fraud

Other

---

# REPORT_ACTIONS

Purpose

Moderator actions.

Columns

id

report_id

action

performed_by

notes

created_at

---

Actions

Warning

Suspend

Ban

Dismiss

Escalate

---

# SUPPORT_TICKETS

Columns

id

user_id

subject

category

priority

status

assigned_to

created_at

updated_at

---

# SUPPORT_MESSAGES

Columns

id

ticket_id

sender_id

message

attachment_url

created_at

---

# ACTIVITY_LOGS

Purpose

User activity timeline.

Columns

id

user_id

activity_type

entity_type

entity_id

metadata_json

created_at

---

Activity Examples

Joined Event

Cancelled Booking

Profile Updated

KYC Submitted

Review Posted

---

# RELATIONSHIPS

Booking

↓

Payment

↓

Wallet

↓

Invoice

↓

Refund

↓

Review

↓

Trust Score

↓

Notification

---

# CONSTRAINTS

One Wallet Per User.

One Invoice Per Payment.

One Coupon Usage Per Booking.

One Review Per Completed Booking.

Trust score history is immutable.

---

# INDEX STRATEGY

Indexes

payment_status

gateway_transaction_id

wallet_id

invoice_number

coupon_code

trust_score

notification_type

report_status

support_status

created_at

---

# FUTURE READY

Gift Cards

Subscriptions

Membership Plans

Referral Rewards

Loyalty Points

Insurance

Escrow Payments

Split Payments

International Currencies

Tax Regions

---

# NEXT MODULE

DATABASE_DESIGN.md (Part 4)

Admin

Audit Logs

CMS

Feature Flags

System Settings

Analytics

Search

Performance

Indexes

Final ER Diagram

Migration Strategy

Prisma Notes
