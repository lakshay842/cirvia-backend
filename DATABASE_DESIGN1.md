# DATABASE DESIGN

Project

Cirvia

Database

PostgreSQL

ORM

Prisma

Version

1.0

--------------------------------------------------

DATABASE PRINCIPLES

--------------------------------------------------

Use PostgreSQL 16+

Use UUID Primary Keys

Soft Delete

Audit Columns

Foreign Keys

Indexes

Transactions

Normalization (3NF)

Prisma Compatible

Scalable for 10 Million Users

--------------------------------------------------

COMMON COLUMNS

--------------------------------------------------

Every table contains

id UUID PK

created_at

updated_at

deleted_at

created_by

updated_by

--------------------------------------------------

ENUMS

--------------------------------------------------

Gender

MALE

FEMALE

OTHER

--------------------------------------------------

Verification Status

PENDING

UNDER_REVIEW

APPROVED

REJECTED

BLOCKED

--------------------------------------------------

Account Status

ACTIVE

INACTIVE

SUSPENDED

DELETED

--------------------------------------------------

Role

USER

HOST

MODERATOR

ADMIN

SUPER_ADMIN

--------------------------------------------------

Provider

EMAIL

GOOGLE

APPLE

PHONE

--------------------------------------------------

Device

ANDROID

IOS

WEB

--------------------------------------------------

USERS

--------------------------------------------------

Purpose

Main Authentication Table

Columns

id

email

phone

password_hash

provider

email_verified

phone_verified

account_status

last_login

is_deleted

created_at

updated_at

deleted_at

Indexes

email UNIQUE

phone UNIQUE

provider

last_login

--------------------------------------------------

USER_PROFILES

--------------------------------------------------

Purpose

Public User Information

Columns

id

user_id

first_name

last_name

username

bio

gender

dob

profile_image

cover_image

occupation

company

city

state

country

latitude

longitude

trust_score

followers_count

following_count

events_joined

events_hosted

reviews_received

average_rating

created_at

updated_at

Indexes

username UNIQUE

city

trust_score

average_rating

--------------------------------------------------

USER_INTERESTS

--------------------------------------------------

Purpose

User Preferences

Columns

id

user_id

interest

created_at

Examples

Gaming

Music

Movies

Travel

Fitness

Books

Coffee

Networking

--------------------------------------------------

SOCIAL_LINKS

--------------------------------------------------

Purpose

Optional User Links

Columns

id

user_id

instagram

linkedin

twitter

github

website

--------------------------------------------------

ROLES

--------------------------------------------------

Columns

id

name

description

--------------------------------------------------

PERMISSIONS

--------------------------------------------------

Columns

id

module

action

--------------------------------------------------

ROLE_PERMISSIONS

--------------------------------------------------

Columns

role_id

permission_id

--------------------------------------------------

USER_ROLES

--------------------------------------------------

Columns

id

user_id

role_id

assigned_by

assigned_at

--------------------------------------------------

EMAIL_VERIFICATION

--------------------------------------------------

Columns

id

user_id

token

expires_at

verified_at

--------------------------------------------------

PHONE_OTP

--------------------------------------------------

Columns

id

user_id

phone

otp

expires_at

verified_at

attempts

--------------------------------------------------

USER_SESSIONS

--------------------------------------------------

Purpose

Track Login Sessions

Columns

id

user_id

refresh_token

device_type

device_name

browser

operating_system

ip_address

country

city

expires_at

last_active

--------------------------------------------------

USER_DEVICES

--------------------------------------------------

Purpose

Trusted Devices

Columns

id

user_id

device_id

device_name

platform

push_token

is_trusted

last_login

--------------------------------------------------

VERIFICATION_REQUESTS

--------------------------------------------------

Purpose

KYC Verification

Columns

id

user_id

verification_type

status

submitted_at

reviewed_at

reviewed_by

remarks

--------------------------------------------------

VERIFICATION_DOCUMENTS

--------------------------------------------------

Columns

id

verification_id

document_type

front_image

back_image

selfie_image

document_number

expiry_date

--------------------------------------------------

VERIFICATION_HISTORY

--------------------------------------------------

Columns

id

verification_id

old_status

new_status

changed_by

reason

created_at

--------------------------------------------------

RELATIONSHIPS

--------------------------------------------------

Users

↓

User Profile

↓

User Interests

↓

Social Links

↓

Roles

↓

Verification

↓

Sessions

↓

Devices

--------------------------------------------------

INDEXES

--------------------------------------------------

email

phone

username

trust_score

city

verification_status

created_at

--------------------------------------------------

CONSTRAINTS

--------------------------------------------------

Unique Email

Unique Username

Unique Phone

One Profile Per User

One Active Verification

One Refresh Token Per Device

--------------------------------------------------

SOFT DELETE

--------------------------------------------------

Users

Profiles

Sessions

Verification

Never Hard Delete

--------------------------------------------------

NEXT MODULE

Part 2

Host System

Event Categories

Events

Media

Location

Bookings

Guest Lists

Waitlist

QR Tickets