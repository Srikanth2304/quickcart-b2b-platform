-- Flyway migration V24: partial returns, return condition handling, and refund status sync

ALTER TABLE return_requests
    ADD COLUMN IF NOT EXISTS returned_quantity INT,
    ADD COLUMN IF NOT EXISTS original_quantity INT,
    ADD COLUMN IF NOT EXISTS remaining_quantity INT,
    ADD COLUMN IF NOT EXISTS return_condition VARCHAR(30);

-- Backfill from legacy quantity field for existing rows.
UPDATE return_requests
SET returned_quantity = COALESCE(returned_quantity, quantity),
    original_quantity = COALESCE(original_quantity, quantity),
    remaining_quantity = COALESCE(remaining_quantity, 0),
    return_condition = COALESCE(return_condition, 'GOOD');

ALTER TABLE return_requests
    ALTER COLUMN returned_quantity SET NOT NULL,
    ALTER COLUMN original_quantity SET NOT NULL,
    ALTER COLUMN remaining_quantity SET NOT NULL,
    ALTER COLUMN return_condition SET NOT NULL;

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_returned_quantity_positive;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_returned_quantity_positive
    CHECK (returned_quantity > 0);

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_original_quantity_positive;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_original_quantity_positive
    CHECK (original_quantity > 0);

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_remaining_quantity_non_negative;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_remaining_quantity_non_negative
    CHECK (remaining_quantity >= 0);

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_return_condition;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_return_condition
    CHECK (return_condition IN ('GOOD','DAMAGED','OPEN_BOX'));

ALTER TABLE refunds
    ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2);

UPDATE refunds
SET refund_amount = COALESCE(refund_amount, 0);

ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS chk_orders_status;

ALTER TABLE orders
    ADD CONSTRAINT chk_orders_status
    CHECK (status IN (
        'PENDING_PAYMENT','PAID','FAILED',
        'PAYMENT_PENDING','CONFIRMED','ACCEPTED','REJECTED',
        'SHIPPED','DELIVERED',
        'RETURN_REQUESTED','RETURN_APPROVED','RETURN_COMPLETED',
        'PARTIALLY_REFUNDED','REFUNDED',
        'CANCELLED'
    ))
    NOT VALID;

