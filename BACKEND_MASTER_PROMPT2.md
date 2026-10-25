# BACKEND_MASTER_PROMPT.md

# Part 2

## Authentication

## Authorization

## Middleware

## Validation

## Security

Version

1.0

---

# AUTHENTICATION MODULE

Build an enterprise-grade authentication system.

Support

* Email + Password
* Phone + OTP
* Google OAuth
* Apple OAuth (future)

Never store plaintext passwords.

Hash passwords using bcrypt.

---

# JWT

Generate

Access Token

Refresh Token

Access Token

15 Minutes

Refresh Token

30 Days

Support

Refresh Rotation

Token Blacklisting

Device Sessions

Multiple Devices

Logout All Devices

---

# AUTH FLOW

Register

↓

Verify Email

↓

Verify Phone

↓

Complete Profile

↓

KYC

↓

Dashboard

---

Login

↓

Access Token

↓

Refresh Token

↓

Redis Session

↓

Dashboard

---

Logout

↓

Blacklist Token

↓

Delete Refresh Token

↓

Success

---

# REGISTER

Validate

Email

Phone

Password

Confirm Password

Accept Terms

Prevent

Duplicate Email

Duplicate Phone

Disposable Emails

Weak Passwords

Spam Registrations

---

# LOGIN

Support

Email

Phone

Google

Remember Me

Track

Login Device

Browser

IP

Country

Timezone

---

# PASSWORD POLICY

Minimum

8 Characters

Require

Uppercase

Lowercase

Number

Special Character

Prevent

Common Passwords

Leaked Passwords (future)

---

# OTP

Support

Email OTP

SMS OTP

Length

6 Digits

Expiry

5 Minutes

Max Attempts

5

Redis Storage

Never store OTP permanently.

---

# EMAIL VERIFICATION

Send Verification Email

Verify Token

Expire Token

Resend Email

Prevent Spam

---

# PASSWORD RESET

Forgot Password

↓

OTP

↓

Reset Token

↓

New Password

↓

Invalidate Previous Sessions

---

# REFRESH TOKEN

Store

Database

Redis

Rotate

Every Refresh

Invalidate

On Logout

On Password Change

---

# DEVICE MANAGEMENT

Track

Browser

OS

IP

Country

City

Last Active

Trusted Device

Allow

Logout Single Device

Logout All Devices

---

# SESSION MANAGEMENT

Create Session

Update Activity

Expire Session

Revoke Session

Admin Session View

---

# ACCOUNT LOCK

Failed Attempts

5

Lock Duration

30 Minutes

Notify User

Security Email

---

# ROLE BASED ACCESS

Roles

Guest

↓

User

↓

Verified User

↓

Host

↓

Moderator

↓

Admin

↓

Super Admin

Never hardcode permissions.

Use RBAC middleware.

---

# PERMISSIONS

Examples

users.read

users.update

users.delete

events.create

events.publish

events.delete

payments.read

payments.refund

admin.dashboard

cms.update

---

# AUTH MIDDLEWARE

Authenticate JWT

↓

Load User

↓

Check Status

↓

Check Permissions

↓

Continue

Else

401

---

# AUTHORIZATION

Create Middleware

requireRole()

requirePermission()

requireVerification()

requireHost()

requireAdmin()

requireOwnership()

---

# REQUEST VALIDATION

Validate

Params

Query

Headers

Body

Files

Use Zod.

Reject Unknown Properties.

Return Friendly Errors.

---

# FILE VALIDATION

Allowed

jpg

jpeg

png

webp

pdf

Maximum

10 MB

Virus Scan Hook (future)

Store

AWS S3

Private Bucket

Signed URLs

---

# GLOBAL MIDDLEWARE

Helmet

Compression

CORS

JSON Parser

Cookie Parser

Request ID

Logger

Rate Limiter

Authentication

Authorization

Validation

Error Handler

404 Handler

---

# RATE LIMITING

Auth APIs

10 / Minute

Search APIs

60 / Minute

Booking APIs

20 / Minute

Payment APIs

10 / Minute

Admin APIs

120 / Minute

Redis Based

---

# CORS

Allow

Website

Admin

Mobile

Staging

Development

Block Unknown Origins

---

# SECURITY HEADERS

Helmet

Content Security Policy

Referrer Policy

XSS Protection

Frame Guard

No Sniff

HSTS

---

# SANITIZATION

Escape HTML

Trim Strings

Normalize Email

Normalize Phone

Reject SQL Injection Patterns

Reject Script Tags

---

# ERROR HANDLING

Never expose

Stack Trace

SQL Errors

Internal Details

Return

Request ID

Error Code

Friendly Message

---

# AUDIT EVENTS

Log

Register

Login

Logout

Password Change

Email Change

Phone Change

KYC

Role Change

Permission Change

Account Lock

Failed Login

Suspicious Activity

---

# SUSPICIOUS ACTIVITY

Detect

Multiple Failed Logins

Different Countries

Impossible Travel

Multiple Devices

New Browser

Notify User

Log Event

---

# PASSWORD CHANGE

Require

Current Password

Validate

New Password

Invalidate

All Refresh Tokens

Force Re-login

---

# DELETE ACCOUNT

Soft Delete

Require Password

Revoke Sessions

Delete Refresh Tokens

Hide Profile

Schedule Permanent Cleanup

---

# API RESPONSE

Authentication Success

```json id="7v4jrh"
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "accessToken": "",
    "refreshToken": "",
    "user": {}
  }
}
```

Authentication Error

```json id="cgy6ld"
{
  "success": false,
  "message": "Invalid credentials.",
  "error": {
    "code": "INVALID_CREDENTIALS"
  }
}
```

---

# UNIT TESTS

Write tests for

Register

Login

Logout

Refresh

Forgot Password

Reset Password

Verify Email

Verify Phone

Permission Middleware

Validation

Rate Limiting

---

# FINAL RULES

Authentication must be:

Secure

Scalable

Stateless

Fast

Auditable

Production Ready

Every protected endpoint must pass through:

Authentication

↓

Authorization

↓

Validation

↓

Business Logic

Never bypass middleware.
