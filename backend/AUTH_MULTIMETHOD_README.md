# Multi-Method Auth (Real-Time)

This backend now supports:
- Local email/password registration and login
- Google OAuth login/signup (real token verification)
- GitHub OAuth login/signup (real access token verification)
- Phone OTP request/verify flow
- Email OTP request/verify flow
- Approval-gated activation for all account types

## Core Rules

All new users created via any signup path are stored as:
- `status = PENDING`
- `isActive = false`
- `approvalStatus = PENDING`

JWT is issued only after approval (`status=ACTIVE`, `isActive=true`).

## New Public Endpoints

- `POST /auth/oauth/google` (also `/api/auth/oauth/google`)
- `POST /auth/oauth/github` (also `/api/auth/oauth/github`)
- `POST /auth/phone/request-otp` (also `/api/auth/phone/request-otp`)
- `POST /auth/phone/verify-otp` (also `/api/auth/phone/verify-otp`)
- `POST /auth/email/request-otp` (also `/api/auth/email/request-otp`)
- `POST /auth/email/verify-otp` (also `/api/auth/email/verify-otp`)

## Config

Set provider/redis config in env:

- `APP_AUTH_GOOGLE_CLIENT_ID`
- `SPRING_REDIS_HOST`
- `SPRING_REDIS_PORT`

Optional:
- `APP_AUTH_GOOGLE_TOKENINFO_URL`
- `APP_AUTH_GITHUB_API_BASE_URL`

## Rate Limits

- Login: max 5 attempts/minute per email
- OTP request: max 5 attempts/hour per phone/email
- Implemented with Redis when available, with in-memory fallback

## Quick Try

```powershell
cd C:\Users\srikanth\Documents\project\quickcart-b2b-platform\backend
.\mvnw.cmd -DskipTests compile
```

Then run app and test via Postman collection entries under `AUTH`.

