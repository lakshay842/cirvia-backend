# BACKEND_MASTER_PROMPT.md

# Part 3

## Event Module

## Booking Module

## Payment Module

## Wallet Module

## Notification Module

## Background Jobs

Version

1.0

---

# EVENT MODULE

Build a complete event management system.

Support

* Public Events
* Private Events
* Invite Only Events
* Approval Required Events
* Free Events
* Paid Events

Every event must belong to one verified host.

---

# EVENT LIFECYCLE

Draft

↓

Pending Review

↓

Published

↓

Booking Open

↓

Event Started

↓

Check-In

↓

Completed

↓

Archived

Cancelled events remain visible in history.

---

# EVENT VALIDATION

Validate

Title

Description

Category

Capacity

Location

Start Time

End Time

Booking Window

Price

Age Restriction

Maximum media uploads.

Prevent duplicate events.

Prevent past dates.

---

# EVENT SERVICE

Responsibilities

Create Event

Update Event

Delete Event

Publish Event

Cancel Event

Feature Event

Duplicate Event

Generate Slug

Generate QR

Update Capacity

Calculate Availability

---

# BOOKING MODULE

Booking must always happen inside a database transaction.

Flow

Create Booking

↓

Validate Capacity

↓

Lock Seats

↓

Create Booking

↓

Create Payment Order

↓

Confirm Booking

↓

Generate QR Ticket

↓

Send Notifications

Never oversell capacity.

---

# BOOKING STATUS

Pending

Waiting Payment

Confirmed

Cancelled

Completed

Rejected

No Show

Refunded

Expired

---

# BOOKING SERVICE

Responsibilities

Create Booking

Cancel Booking

Approve Booking

Reject Booking

Generate Ticket

Generate QR

Attendance

Waitlist

Refund

---

# WAITLIST

If capacity reached

↓

Join Waitlist

↓

Booking Cancelled

↓

Promote Next User

↓

Notification Sent

---

# QR CHECK-IN

Generate encrypted QR.

One QR

↓

One Booking

↓

One Check-In

↓

One Check-Out

Prevent duplicate scans.

---

# PAYMENT MODULE

Architecture

Controller

↓

Service

↓

Gateway Adapter

↓

Razorpay

Future

Stripe

Cashfree

PhonePe

Do not tightly couple business logic to a gateway.

---

# PAYMENT FLOW

Booking

↓

Create Order

↓

Gateway

↓

Verify Signature

↓

Create Transaction

↓

Update Booking

↓

Update Wallet

↓

Invoice

↓

Notification

Everything inside transactions where appropriate.

---

# PAYMENT STATES

Pending

Authorized

Captured

Failed

Refunded

Partially Refunded

Chargeback

Expired

---

# REFUND FLOW

User

↓

Refund Request

↓

Host Review (optional)

↓

Admin Approval (optional)

↓

Gateway Refund

↓

Wallet Update

↓

Notification

---

# WALLET MODULE

Host Wallet

Available Balance

Pending Balance

Withdrawals

Settlement

Commission

Transactions

Every financial change creates a ledger entry.

Never update balance directly.

---

# WALLET SERVICE

Credit

Debit

Settlement

Commission

Refund

Withdrawal

Adjustment

Always derive balances from transactions when reconciling.

---

# INVOICE

Generate PDF

Invoice Number

GST Ready

Download URL

Email Attachment

Store invoice metadata.

---

# COUPON MODULE

Support

Percentage

Flat

First Booking

Referral

Host Coupon

Expiry

Usage Limit

Minimum Amount

Maximum Discount

---

# NOTIFICATION MODULE

Channels

In-App

Email

Push

SMS (Future)

Never send notifications directly from controllers.

Use events/jobs.

---

# NOTIFICATION EVENTS

Registration

Verification

Booking Created

Booking Approved

Booking Cancelled

Payment Success

Refund

Reminder

Review Reminder

Trust Score Updated

Support Reply

---

# EMAIL SERVICE

Templates

Welcome

Verify Email

Booking

Invoice

Refund

Password Reset

Host Approval

KYC Result

Render dynamic templates.

---

# PUSH SERVICE

Firebase Cloud Messaging (Future)

Apple Push (Future)

Queue delivery.

Retry failures.

---

# BACKGROUND JOBS

Use BullMQ.

Queues

Email Queue

Notification Queue

Payment Queue

Reminder Queue

Analytics Queue

Cleanup Queue

Thumbnail Queue

Search Index Queue

---

# CRON JOBS

Run

Every Minute

Expired OTP Cleanup

Every Hour

Expired Booking Cleanup

Every Day

Trust Score Recalculation

Reminder Notifications

Wallet Settlement

Analytics Aggregation

Every Week

Database Cleanup

Temporary File Cleanup

Every Month

Reports

Revenue Summary

Host Summary

---

# FILE STORAGE

AWS S3

Folders

avatars/

covers/

events/

verification/

documents/

invoices/

Use signed URLs for private assets.

---

# SEARCH

Support

Keyword

Category

City

Date

Price

Verified Host

Distance

Trending

Future

Meilisearch

Elasticsearch

---

# CACHING

Redis

Cache

Categories

Cities

Featured Events

Trending Events

Host Profile

Event Details

Invalidate cache on updates.

---

# TRANSACTIONS

Always use Prisma transactions for:

Booking

Payment

Refund

Wallet

Verification Approval

Never leave partial updates.

---

# WEBHOOKS

Handle

Payment Success

Payment Failure

Refund Success

Refund Failure

Verify signatures.

Retry failed processing.

---

# OBSERVABILITY

Track

Bookings

Payments

Queue Jobs

Failures

Retries

Latency

Notification Delivery

---

# TESTING

Write tests for

Event Creation

Booking Flow

Payment Verification

Refund Flow

Wallet Settlement

QR Check-In

Notification Dispatch

Queue Workers

Cron Jobs

---

# FINAL RULES

Business logic belongs in Services.

External integrations belong in Providers.

Long-running tasks belong in Queues.

Financial operations must be transactional.

Background jobs must be idempotent.

Every booking, payment, refund and wallet update must be fully traceable through logs and audit records.
