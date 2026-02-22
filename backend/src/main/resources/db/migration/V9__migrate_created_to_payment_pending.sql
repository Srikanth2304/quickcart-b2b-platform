-- Flyway migration V9: Fix legacy order status values
-- Orders created before enterprise hardening have status 'CREATED'
-- which was renamed to 'PAYMENT_PENDING' in the Java enum.
-- This migration updates all existing rows to match the new enum value.

UPDATE orders SET status = 'PAYMENT_PENDING' WHERE status = 'CREATED';

