-- Flyway migration V11: schema integrity + performance indexes
-- Goals:
-- 1) Enforce unique users.email at DB level
-- 2) Align refunds.payment_id with one-to-one mapping
-- 3) Add high-value indexes used by repositories/services

-- 1) users.email uniqueness (defensive check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'unique_user_email'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT unique_user_email UNIQUE (email);
    END IF;
END $$;

-- 2) refunds.payment_id must be present and unique for one-to-one Refund<->Payment
ALTER TABLE refunds
    ALTER COLUMN payment_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uk_refunds_payment_id'
    ) THEN
        ALTER TABLE refunds
            ADD CONSTRAINT uk_refunds_payment_id UNIQUE (payment_id);
    END IF;
END $$;

-- 3) Indexes for hot query paths
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_retailer_id ON orders(retailer_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);

