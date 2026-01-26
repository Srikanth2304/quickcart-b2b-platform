-- Schema changes for Delivery Address feature (PostgreSQL)
-- Note: spring.jpa.hibernate.ddl-auto=validate, so these must be applied to the DB manually.

-- 1) Addresses table (belongs to retailer user)
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,

    name VARCHAR(100),
    phone VARCHAR(15),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_default BOOLEAN DEFAULT FALSE,

    -- soft delete
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMP NULL,

    -- auditing (matches BaseAuditableEntity)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by BIGINT NULL,
    updated_by BIGINT NULL,

    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_addresses_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT fk_addresses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_active ON addresses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON addresses(user_id, is_default);

-- Enforce only one default address per user (active only)
CREATE UNIQUE INDEX IF NOT EXISTS ux_addresses_one_default_per_user
ON addresses(user_id)
WHERE is_default = true AND is_active = true;

-- 2) Add immutable delivery snapshot fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_name VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone VARCHAR(15);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_line1 VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_line2 VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_state VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_pincode VARCHAR(10);

