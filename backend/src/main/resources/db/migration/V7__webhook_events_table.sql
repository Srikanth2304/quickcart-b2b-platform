-- Webhook events table for Razorpay webhook idempotency.
-- Stores the event ID from each processed webhook so duplicates are skipped.

CREATE TABLE webhook_events (
    id              BIGSERIAL       PRIMARY KEY,
    event_id        VARCHAR(100)    NOT NULL,
    event_type      VARCHAR(100)    NOT NULL,
    status          VARCHAR(30)     NOT NULL,
    note            VARCHAR(500),
    received_at     TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_webhook_events_event_id UNIQUE (event_id)
);

CREATE INDEX idx_webhook_events_received_at ON webhook_events (received_at);

