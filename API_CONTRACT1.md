# API_CONTRACT.md

Version

1.0

API Style

REST

Base URL

```text
/api/v1
```

Content Type

```http
application/json
```

Authentication

JWT Access Token

Refresh Token

Bearer Authentication

---

# Standard Success Response

```json
{
  "success": true,
  "message": "Success",
  "data": {},
  "meta": {}
}
```

---

# Standard Error Response

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

# AUTH MODULE

## Register

POST

```http
/api/v1/auth/register
```

Body

```json
{
  "firstName": "",
  "lastName": "",
  "email": "",
  "phone": "",
  "password": "",
  "confirmPassword": ""
}
```

Response

```json
{
  "success": true,
  "message": "Registration successful. Please verify your email."
}
```

Validation

* Email unique
* Phone unique
* Password minimum 8 characters
* Strong password required

---

## Login

POST

```http
/api/v1/auth/login
```

Body

```json
{
  "email": "",
  "password": ""
}
```

Response

```json
{
  "accessToken": "",
  "refreshToken": "",
  "user": {}
}
```

---

## Login With Phone

POST

```http
/api/v1/auth/login-phone
```

Body

```json
{
  "phone": "",
  "otp": ""
}
```

---

## Google Login

POST

```http
/api/v1/auth/google
```

---

## Refresh Token

POST

```http
/api/v1/auth/refresh
```

Body

```json
{
  "refreshToken": ""
}
```

---

## Logout

POST

```http
/api/v1/auth/logout
```

---

## Forgot Password

POST

```http
/api/v1/auth/forgot-password
```

---

## Reset Password

POST

```http
/api/v1/auth/reset-password
```

---

## Send Email Verification

POST

```http
/api/v1/auth/send-email-verification
```

---

## Verify Email

POST

```http
/api/v1/auth/verify-email
```

---

## Send Phone OTP

POST

```http
/api/v1/auth/send-phone-otp
```

---

## Verify Phone OTP

POST

```http
/api/v1/auth/verify-phone-otp
```

---

# USER MODULE

## Get My Profile

GET

```http
/api/v1/users/me
```

Authorization

Bearer Token

---

## Update Profile

PATCH

```http
/api/v1/users/profile
```

Body

```json
{
  "firstName": "",
  "lastName": "",
  "bio": "",
  "city": "",
  "state": "",
  "country": ""
}
```

---

## Upload Avatar

POST

```http
/api/v1/users/avatar
```

Multipart

---

## Upload Cover Image

POST

```http
/api/v1/users/cover-image
```

---

## Get Public Profile

GET

```http
/api/v1/users/:username
```

---

## Get User Interests

GET

```http
/api/v1/users/interests
```

---

## Update Interests

PATCH

```http
/api/v1/users/interests
```

---

## Get Followers

GET

```http
/api/v1/users/followers
```

---

## Get Following

GET

```http
/api/v1/users/following
```

---

## Follow User

POST

```http
/api/v1/users/follow
```

---

## Unfollow User

DELETE

```http
/api/v1/users/unfollow/:id
```

---

## Get Trust Score

GET

```http
/api/v1/users/trust-score
```

---

# KYC MODULE

## Submit Verification

POST

```http
/api/v1/verification
```

Multipart

Files

* Government ID
* Selfie

---

## Get Verification Status

GET

```http
/api/v1/verification/status
```

---

## Resubmit Verification

POST

```http
/api/v1/verification/resubmit
```

---

## Get Verification History

GET

```http
/api/v1/verification/history
```

---

# RESPONSE STATUS CODES

200 OK

201 Created

204 No Content

400 Validation Error

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Unprocessable Entity

429 Too Many Requests

500 Internal Server Error

---

# AUTHORIZATION

Public Routes

* Landing
* Login
* Register
* Event Discovery
* Public Event Details

Protected Routes

* Profile
* KYC
* Bookings
* Dashboard
* Host
* Payments

Admin Routes

* Admin Dashboard
* Moderation
* Reports
* Analytics

---

# VALIDATION RULES

* All inputs validated using Zod.
* Request payloads sanitized.
* Unknown fields rejected.
* Strong password policy.
* Email format validated.
* Phone format validated.
* JWT required for protected endpoints.
