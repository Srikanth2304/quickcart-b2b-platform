# Dual Response Mode Support

## Overview

The backend supports **optional response wrapping** for selected action endpoints that historically returned plain string messages.

Header used to enable wrapped mode:

`X-API-RESPONSE-WRAPPED=true`

- If header is present with value `true`: API returns `ApiResponse<T>`.
- If header is missing (or not `true`): API returns the original raw string response.

This design allows backward-compatible migration for existing clients while enabling a standardized response contract for newer clients.

---

## Why This Exists

### Purpose of the header

The header gives clients explicit control over response shape:

- **Legacy mode (default):** simple string body (existing behavior).
- **Wrapped mode (opt-in):** structured JSON with `success`, `message`, `data`, and `timestamp`.

### Backward compatibility

No existing client integration needs to change.

- Existing clients that do not send the header continue receiving raw string responses.
- New clients can opt in at endpoint/request level without breaking older consumers.

### Migration path

- Start by enabling the header in one client/module.
- Parse wrapped response JSON only when header is enabled.
- Gradually roll out across services/apps.
- Keep legacy mode for external/older integrations until fully migrated.

---

## Response Behavior

## Without header

Request:

`POST /orders/1/accept`

Headers:

- (no `X-API-RESPONSE-WRAPPED` header)

Response:

```json
"Order accepted successfully"
```

## With header

Request:

`POST /orders/1/accept`

Headers:

- `X-API-RESPONSE-WRAPPED=true`

Response:

```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": null,
  "timestamp": "2026-01-01T10:00:00"
}
```

---

## Affected Controllers and Endpoints

Dual response mode is implemented for legacy string action endpoints in the following controllers.

## `ProductController`

- `POST /products`
- `PUT /products/{id}`
- `PATCH /products/{id}/deactivate`

## `OrderController`

- `POST /orders/{orderId}/accept`
- `POST /orders/{orderId}/reject`
- `PUT /orders/{orderId}/status`
- `POST /orders/{orderId}/shipment`
- `POST /orders/{orderId}/deliver`
- `POST /orders/{orderId}/cancel` (idempotent)
- `POST /orders/{orderId}/refund/approve`
- `POST /orders/{orderId}/refund/reject`

## `PaymentController`

- `POST /payments/razorpay/verify` (idempotent)

---

## Non-Affected / Special Cases

- Webhook endpoints remain raw/protocol-specific and are **not wrapped**.
- Existing JSON endpoints that already return `ApiResponse<T>` continue as-is.
- Error responses are handled separately by global exception handling (`ApiErrorResponse`).

---

## Client Migration Guidance

## Legacy clients

- **No change required.**
- Continue calling endpoints without the header.
- Continue parsing raw string responses.

## New clients

- Send header: `X-API-RESPONSE-WRAPPED=true`
- Parse response as:

```json
{
  "success": true,
  "message": "...",
  "data": null,
  "timestamp": "..."
}
```

- Recommended: create a shared response parser/util in frontend/mobile SDKs.

## Suggested rollout strategy

1. Enable wrapped mode in development for one feature area.
2. Validate parsing and telemetry.
3. Roll out per endpoint group.
4. Keep fallback to legacy mode during transition.

---

## Quick Test Examples

```http
POST /orders/1/accept
Authorization: Bearer <token>
```

```http
POST /orders/1/accept
Authorization: Bearer <token>
X-API-RESPONSE-WRAPPED: true
```

```http
POST /payments/razorpay/verify
Authorization: Bearer <token>
Idempotency-Key: abc-123
X-API-RESPONSE-WRAPPED: true
Content-Type: application/json
```

---

## Summary

Dual response mode provides a safe, incremental migration path:

- **Legacy clients -> no changes needed**
- **New clients -> standardized wrapped responses via header opt-in**

This preserves compatibility while moving the API toward a consistent response contract.

