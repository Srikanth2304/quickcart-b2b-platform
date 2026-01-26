-- Flyway migration V4: Remove address_line2 field from addresses + order delivery snapshot
-- Note: This is a destructive change. Make sure you don't need the data before applying.

ALTER TABLE addresses DROP COLUMN IF EXISTS address_line2;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_address_line2;

