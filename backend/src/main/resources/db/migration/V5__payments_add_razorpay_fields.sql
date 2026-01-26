-- Flyway migration V5: Add Razorpay fields to payments table (safe, additive)

ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway VARCHAR(50);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);

-- Backfill gateway for existing rows if column exists and is NULL
UPDATE payments SET gateway = 'RAZORPAY' WHERE gateway IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id ON payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id ON payments(razorpay_payment_id);

