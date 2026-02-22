-- Flyway migration V8: Enterprise hardening
-- Idempotency requests, order events, activity timestamps

-- ═══════════════════════════════════════════════════════════════
-- 1. Idempotency requests table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS idempotency_requests (
    id              BIGSERIAL       PRIMARY KEY,
    idempotency_key VARCHAR(255)    NOT NULL,
    endpoint        VARCHAR(255)    NOT NULL,
    response_json   TEXT,
    http_status     INTEGER         NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uk_idempotency_key_endpoint UNIQUE (idempotency_key, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_requests_created_at
    ON idempotency_requests (created_at);

-- ═══════════════════════════════════════════════════════════════
-- 2. Order events (audit log) table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS order_events (
    id              BIGSERIAL       PRIMARY KEY,
    order_id        BIGINT          NOT NULL,
    event_type      VARCHAR(50)     NOT NULL,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30),
    actor_user_id   BIGINT,
    note            VARCHAR(1000),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_order_events_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_order_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id
    ON order_events (order_id);

CREATE INDEX IF NOT EXISTS idx_order_events_created_at
    ON order_events (created_at);

-- ═══════════════════════════════════════════════════════════════
-- 3. Order activity timestamps
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE orders ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at    TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at  TIMESTAMP;
