-- Flyway migration V10: Add payment_method column to orders table
-- Supports ONLINE (Razorpay) and CASH_ON_DELIVERY payment methods.
-- Existing orders default to 'ONLINE' (backward compatible).

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) NOT NULL DEFAULT 'ONLINE';

-- Update payments gateway enum: allow 'NONE' for COD orders
-- (No constraint change needed — PostgreSQL VARCHAR enum is application-enforced)

-- Update payments status enum: allow 'PENDING_COLLECTION' and 'COLLECTED' for COD
-- (No constraint change needed — PostgreSQL VARCHAR enum is application-enforced)
