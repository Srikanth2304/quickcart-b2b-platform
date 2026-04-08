# QuickCart API Audit Report

## Scope
- Frontend scan targets: src/services, src/api, src/utils
- Postman source: src/QuickCart B2B - Controller Aligned.postman_collection.json
- Endpoint index used: postman_unique_endpoints.json and postman_domain_grouped_unique.md

## Step 1: Frontend API Calls (scanned scope)

METHOD | URL | FILE LOCATION
---|---|---
GET | /users/pending | src/services/superAdminService.js
POST | /admin/users | src/services/superAdminService.js

Notes:
- src/api/axios.js contains interceptor logic and does not define fixed API resource endpoints.
- src/utils has no axios resource calls.

## Step 2: Postman Backend Endpoints (relevant to admin scope)

METHOD | URL
---|---
POST | /admin/users
GET | /users/pending
PATCH | /users/{id}/approve
PATCH | /users/{id}/reject
PATCH | /users/{id}/activate
PATCH | /users/{id}/deactivate

## Step 3: Frontend vs Postman Match

Frontend API | Backend Exists | Status | Fix Required
---|---|---|---
GET /users/pending | YES | VALID | None
POST /admin/users | YES | VALID | None
GET /admin/users?role=ADMIN (old) | NO | INVALID API CALL | Removed from frontend
GET /users?role=ADMIN (old) | NO | INVALID API CALL | Removed from frontend
GET /admin/users/admin (old) | NO | INVALID API CALL | Removed from frontend
GET /users (old) | NO | INVALID API CALL | Removed from frontend
GET /admin/users (old) | NO | INVALID API CALL | Removed from frontend

## Step 4: Payload Validation

POST /admin/users payload in frontend:
- name
- email
- password
- roles: ["ADMIN"]
- isActive: true

Result: Matches Postman contract.

## Step 5: Authorization Header Validation

Request interceptor confirmed in src/api/axios.js:
- Reads token from localStorage
- Sends Authorization: Bearer <token>

Result: Correct.

## Step 6: Error Handling Validation

Added in axios response interceptor:
- console.error(error.response.data) logging
- Toast fallback: "API Error: Check backend logs" for HTTP 4xx/5xx

Result: Enabled globally.

## Fix Summary Implemented

1. Removed unsupported list-user endpoint probing from src/services/superAdminService.js.
2. Kept only Postman-backed calls: GET /users/pending and POST /admin/users.
3. Added global API error logging + toast fallback in src/api/axios.js.

## Backend Contract Gap

The Postman contract currently does not expose a GET endpoint for:
- listing all admins
- listing all users

To support full admin/user tables with real data, backend should add one of:
- GET /admin/users
- GET /users
or equivalent documented alternatives.
