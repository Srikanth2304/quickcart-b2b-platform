# User Management and Authentication (Production Workflow)

This document describes the implemented role hierarchy, registration approval model, JWT flow, and key APIs in the backend.

## 1) Role Hierarchy

```
SUPER_ADMIN -> creates ADMIN
ADMIN -> creates CATALOG_MANAGER
CATALOG_MANAGER -> approves/rejects/deactivates MANUFACTURER and RETAILER
MANUFACTURER -> self-registers via /auth/register (PENDING)
RETAILER -> self-registers via /auth/register (PENDING)
```

Creation hierarchy is enforced in `AdminUserService.validateRequestedRoles(...)`.

## 2) User Lifecycle Status

`UserStatus` enum:
- `PENDING`
- `ACTIVE`
- `INACTIVE`
- `SUSPENDED`

Rules:
- Self-registered users: `PENDING` + `isActive=false`
- Approved users: `ACTIVE` + `isActive=true`
- Deactivated users: `INACTIVE` + `isActive=false`
- Rejected users: `SUSPENDED` + `isActive=false`

## 3) User Entity Model

Implemented in `User`:
- `id`
- `name`
- `email`
- `password`
- `roles` (many-to-many to `Role`; primary role derived by priority)
- `status` (`UserStatus`)
- `isActive`
- `createdAt`
- `updatedAt`
- `deletedAt` (soft delete)
- `deletedBy` (soft delete actor)

Audit columns `createdBy` and `updatedBy` are inherited from `BaseAuditableEntity`.

## 4) APIs

### AuthController (`/auth`)
- `POST /auth/register`
  - Allows only `MANUFACTURER` or `RETAILER`
  - Creates user in `PENDING`
  - Returns success envelope without JWT token until approval
- `POST /auth/login`
  - Allows login only when user is `ACTIVE`, `isActive=true`, and not soft-deleted

### AdminUserController (`/admin/users`)
- `POST /admin/users`
  - `SUPER_ADMIN` can create only `ADMIN`
  - `ADMIN` can create only `CATALOG_MANAGER`

### UserApprovalController (`/users`)
- `GET /users/pending`
- `PATCH /users/{id}/approve`
- `PATCH /users/{id}/reject`
- `PATCH /users/{id}/deactivate`
- `PATCH /users/{id}/activate`

`CATALOG_MANAGER` actions are restricted to `MANUFACTURER` and `RETAILER` targets.

## 5) Service Layer

- `AuthService`
  - Registration role validation
  - Password hashing with `BCryptPasswordEncoder`
  - Email uniqueness checks
  - Status-aware login gate
- `AdminUserService`
  - Role hierarchy enforcement for admin-created users
- `ApprovalService`
  - Pending list and status transitions (approve/reject/deactivate/activate)
- `UserService`
  - Shared user lookup and role utility methods

## 6) JWT Lifecycle

### Token generation
- In `AuthService.login(...)` after successful authentication and ACTIVE status checks.
- Created by `JwtUtil.generateToken(user)`.

### Token validation
- In `JwtAuthFilter` for each request with `Authorization: Bearer <token>`.
- Signature and expiration validated using `JwtUtil.validateToken(...)`.

### Authentication filter behavior
1. Read bearer token from header
2. Validate token
3. Extract username
4. Load user from DB (`CustomUserDetailsService`) with soft-delete filter
5. Build `Authentication` and set `SecurityContext`

### Authorization enforcement
- Method-level RBAC via `@PreAuthorize` in controllers
- Authorities are derived from DB-backed `UserDetails` (not blindly trusted from JWT claims)

## 7) Database Migration

Flyway migration added:
- `V15__user_status_and_approval_workflow.sql`

What it does:
- Adds `users.status`
- Backfills status from `is_active`
- Adds `users.deleted_at` and `users.deleted_by`
- Adds `chk_users_status`
- Adds status/deleted indexes

## 8) Soft Delete and Audit Logging

- Hard delete is avoided for users by introducing `deletedAt` and `deletedBy`.
- Spring Data auditing tracks `createdBy` and `updatedBy` via `SecurityAuditorAware`.
- Approval actions log actor and target transitions.

## 9) Text Flow Diagram

```
[SUPER_ADMIN]
    |
    | POST /admin/users (create ADMIN)
    v
[ADMIN]
    |
    | POST /admin/users (create CATALOG_MANAGER)
    v
[CATALOG_MANAGER]
    |
    | reviews pending users from GET /users/pending
    | approves/rejects/deactivates/reactivates via PATCH /users/{id}/...
    v
[MANUFACTURER/RETAILER SELF-REGISTER]
    |
    | POST /auth/register -> status=PENDING
    v
[PENDING USER]
    |
    | approved by catalog manager
    v
[ACTIVE USER FLOW]
    |
    | POST /auth/login -> JWT
    | access role-protected APIs
    v
[BUSINESS OPERATIONS]
```

