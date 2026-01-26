-- Flyway migration V3: Add address type + additional contact fields (PostgreSQL)

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_type VARCHAR(20);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(15);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS locality VARCHAR(150);
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark VARCHAR(150);

-- Optional helpful index for filtering
CREATE INDEX IF NOT EXISTS idx_addresses_user_type ON addresses(user_id, address_type);
