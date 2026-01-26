-- Flyway migration V6: Add optional gateway field to refunds (safe, additive)

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_refunds_gateway ON refunds(gateway);

