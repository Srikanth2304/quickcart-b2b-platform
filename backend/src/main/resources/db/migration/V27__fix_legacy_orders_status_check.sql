-- Fix legacy orders status check constraint naming drift.
-- Some databases still have orders_status_check (legacy) instead of chk_orders_status.
-- This causes /payments/razorpay/verify to fail when status is set to PAID.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status
    CHECK (status IN (
        'PENDING_PAYMENT',
        'PAID',
        'FAILED',
        'PAYMENT_PENDING',
        'CONFIRMED',
        'ACCEPTED',
        'REJECTED',
        'SHIPPED',
        'DELIVERED',
        'RETURN_REQUESTED',
        'RETURN_APPROVED',
        'RETURN_COMPLETED',
        'PARTIALLY_REFUNDED',
        'REFUNDED',
        'CANCELLED'
    )) NOT VALID;

