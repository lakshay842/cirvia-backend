# DATABASE DESIGN

Part 4

Admin System

Analytics

CMS

Audit

Search

Performance

Deployment

Future Architecture

--------------------------------------------------

ADMIN_USERS

--------------------------------------------------

Purpose

Platform Administrators

Columns

id

user_id

designation

department

status

last_login

created_at

updated_at

--------------------------------------------------

ADMIN_ROLES

--------------------------------------------------

id

name

description

priority

--------------------------------------------------

ADMIN_PERMISSIONS

--------------------------------------------------

id

module

action

description

--------------------------------------------------

ADMIN_ROLE_PERMISSIONS

--------------------------------------------------

role_id

permission_id

--------------------------------------------------

ADMIN_ACTIVITY_LOGS

--------------------------------------------------

Purpose

Track every admin action.

Columns

id

admin_id

action

module

entity

entity_id

old_data

new_data

ip_address

browser

device

created_at

Examples

Approve User

Reject Host

Suspend Account

Delete Event

Refund Payment

--------------------------------------------------

AUDIT_LOGS

--------------------------------------------------

Purpose

Track every important action.

Columns

id

user_id

action

entity

entity_id

changes

ip

browser

device

created_at

Examples

Login

Logout

Password Change

Booking

Payment

Review

Verification

--------------------------------------------------

SYSTEM_SETTINGS

--------------------------------------------------

Purpose

Global Configuration

Columns

id

key

value

type

updated_by

updated_at

Examples

Platform Fee

Maintenance Mode

OTP Expiry

Booking Timeout

Trust Score Rules

--------------------------------------------------

FEATURE_FLAGS

--------------------------------------------------

Purpose

Enable / Disable Features

Columns

id

feature_name

enabled

environment

created_at

Examples

AI Recommendations

Chat

Communities

Membership

Wallet

--------------------------------------------------

CMS_PAGES

--------------------------------------------------

Purpose

Dynamic Pages

Columns

id

title

slug

seo_title

seo_description

content

status

created_at

updated_at

--------------------------------------------------

CMS_BANNERS

--------------------------------------------------

Purpose

Homepage Banners

Columns

id

title

image

link

position

status

start_date

end_date

--------------------------------------------------

FAQS

--------------------------------------------------

id

question

answer

category

order

status

--------------------------------------------------

ANNOUNCEMENTS

--------------------------------------------------

id

title

message

priority

start_date

end_date

status

--------------------------------------------------

EMAIL_TEMPLATES

--------------------------------------------------

Purpose

Dynamic Email Templates

Columns

id

name

subject

body

variables

status

--------------------------------------------------

PUSH_TEMPLATES

--------------------------------------------------

id

name

title

message

status

--------------------------------------------------

SMS_TEMPLATES

--------------------------------------------------

id

name

message

status

--------------------------------------------------

SEARCH_HISTORY

--------------------------------------------------

Purpose

Search Analytics

Columns

id

user_id

keyword

city

category

filters

created_at

--------------------------------------------------

RECENT_SEARCHES

--------------------------------------------------

id

user_id

keyword

created_at

--------------------------------------------------

POPULAR_SEARCHES

--------------------------------------------------

id

keyword

count

last_used

--------------------------------------------------

ANALYTICS

--------------------------------------------------

DAILY_STATS

Columns

date

new_users

verified_users

hosts

events

bookings

payments

revenue

reviews

reports

--------------------------------------------------

MONTHLY_STATS

--------------------------------------------------

Same Structure

--------------------------------------------------

USER_ANALYTICS

--------------------------------------------------

user_id

events_joined

events_hosted

bookings

reviews

trust_score

wallet_balance

--------------------------------------------------

HOST_ANALYTICS

--------------------------------------------------

host_id

events

earnings

attendance

rating

cancellation_rate

--------------------------------------------------

EVENT_ANALYTICS

--------------------------------------------------

event_id

views

bookings

attendance

shares

reviews

--------------------------------------------------

CACHE TABLES

--------------------------------------------------

Trending Events

Popular Categories

Popular Cities

Top Hosts

Recommended Events

--------------------------------------------------

API_KEYS

--------------------------------------------------

Purpose

Future Public APIs

Columns

id

name

api_key

secret

status

expires_at

--------------------------------------------------

WEBHOOKS

--------------------------------------------------

Purpose

Future Integrations

Columns

id

url

event

secret

status

--------------------------------------------------

WEBHOOK_LOGS

--------------------------------------------------

Purpose

Track Delivery

Columns

id

webhook_id

payload

response

status

created_at

--------------------------------------------------

FILE_UPLOADS

--------------------------------------------------

Purpose

S3 Assets

Columns

id

user_id

file_name

url

type

size

mime

uploaded_at

--------------------------------------------------

DELETED_RECORDS

--------------------------------------------------

Purpose

Recovery

Columns

id

table_name

record_id

deleted_by

deleted_at

restore_until

--------------------------------------------------

DATABASE INDEXES

--------------------------------------------------

UNIQUE

email

phone

username

booking_reference

payment_reference

invoice_number

coupon_code

--------------------------------------------------

NORMAL INDEX

created_at

updated_at

city

country

status

event_date

host_id

user_id

category_id

--------------------------------------------------

COMPOSITE INDEX

(city,event_date)

(host_id,status)

(user_id,created_at)

(event_id,status)

(payment_status,created_at)

--------------------------------------------------

PARTITIONING

Future

Payments

Bookings

Activity Logs

Notifications

Analytics

--------------------------------------------------

DATABASE BACKUP

--------------------------------------------------

Daily

Weekly

Monthly

Point in Time Recovery

--------------------------------------------------

SECURITY

--------------------------------------------------

Encrypt Sensitive Data

Never Store Password

Use UUID

Use Audit Logs

Private KYC Storage

S3 Signed URL

--------------------------------------------------

PERFORMANCE

--------------------------------------------------

Redis Cache

Pagination

Cursor Pagination

Search Index

Database Index

Lazy Queries

Connection Pool

Read Replicas (Future)

--------------------------------------------------

MICROSERVICE READY

--------------------------------------------------

Authentication Service

User Service

Host Service

Event Service

Booking Service

Payment Service

Notification Service

Review Service

Analytics Service

Search Service

AI Service

--------------------------------------------------

FUTURE DATABASE

--------------------------------------------------

Communities

Community Members

Organization Accounts

Company Pages

Travel Groups

Messaging

Chat

Voice Rooms

Stories

Achievements

Gamification

Membership Plans

Referral Program

Creator Pages

Event Series

Recurring Events

AI Recommendation Engine

--------------------------------------------------

TOTAL MODULES

Authentication

Users

Profiles

Roles

Permissions

Verification

Hosts

Events

Categories

Media

Bookings

Payments

Wallet

Reviews

Trust

Notifications

Reports

Support

CMS

Admin

Analytics

Search

Audit

Settings

Feature Flags

API Keys

Webhooks

Files

System

--------------------------------------------------

DATABASE STATUS

Production Ready

Prisma Ready

Scalable

Cloud Ready

Microservice Ready

Enterprise Ready
