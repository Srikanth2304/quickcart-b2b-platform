-- Flyway migration V12: enum check constraints for core status columns
-- Added as NOT VALID for compatibility with existing data; enforces new/updated rows.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_status') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_status
            CHECK (status IN ('PAYMENT_PENDING','CONFIRMED','ACCEPTED','REJECTED','SHIPPED','DELIVERED','CANCELLED'))
            NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_status') THEN
        ALTER TABLE payments
            ADD CONSTRAINT chk_payments_status
            CHECK (status IN ('INITIATED','SUCCESS','FAILED','PENDING_COLLECTION','COLLECTED','REFUND_PENDING','REFUNDED','REFUND_FAILED'))
            NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_refunds_status') THEN
        ALTER TABLE refunds
            ADD CONSTRAINT chk_refunds_status
            CHECK (status IN ('PENDING_APPROVAL','APPROVED','PROCESSING','PROCESSED','REJECTED','FAILED'))
            NOT VALID;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_status') THEN
        ALTER TABLE products
            ADD CONSTRAINT chk_products_status
            CHECK (status IN ('ACTIVE','INACTIVE'))
            NOT VALID;
    END IF;
END $$;

