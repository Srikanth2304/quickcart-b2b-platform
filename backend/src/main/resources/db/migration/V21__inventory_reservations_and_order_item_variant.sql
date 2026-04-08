-- Flyway migration V21: inventory reservations + variant-aware order items

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    variant_id BIGINT,
    user_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    expiry_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM'
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_reservations_product') THEN
        ALTER TABLE inventory_reservations
            ADD CONSTRAINT fk_inventory_reservations_product
            FOREIGN KEY (product_id)
            REFERENCES products(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_reservations_variant') THEN
        ALTER TABLE inventory_reservations
            ADD CONSTRAINT fk_inventory_reservations_variant
            FOREIGN KEY (variant_id)
            REFERENCES product_variants(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_inventory_reservations_user') THEN
        ALTER TABLE inventory_reservations
            ADD CONSTRAINT fk_inventory_reservations_user
            FOREIGN KEY (user_id)
            REFERENCES users(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_product_id
    ON inventory_reservations(product_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_variant_id
    ON inventory_reservations(variant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_user_id
    ON inventory_reservations(user_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status_expiry
    ON inventory_reservations(status, expiry_time);

ALTER TABLE inventory_reservations
    DROP CONSTRAINT IF EXISTS chk_inventory_reservations_quantity_positive;

ALTER TABLE inventory_reservations
    ADD CONSTRAINT chk_inventory_reservations_quantity_positive
    CHECK (quantity > 0);

ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS variant_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_order_items_variant') THEN
        ALTER TABLE order_items
            ADD CONSTRAINT fk_order_items_variant
            FOREIGN KEY (variant_id)
            REFERENCES product_variants(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
    ON order_items(variant_id);

