-- ============================================================
-- MANUAL DB SETUP: Run this if Flyway V7 migration didn't apply
-- ============================================================
-- This creates the webhook_events table needed by the
-- Razorpay webhook idempotency system (WebhookEvent entity).
--
-- Run against: localhost:5432/Retail (postgres user)
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id              BIGSERIAL       PRIMARY KEY,
    event_id        VARCHAR(100)    NOT NULL,
    event_type      VARCHAR(100)    NOT NULL,
    status          VARCHAR(30)     NOT NULL,
    note            VARCHAR(500),
    received_at     TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_webhook_events_event_id UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events (received_at);
