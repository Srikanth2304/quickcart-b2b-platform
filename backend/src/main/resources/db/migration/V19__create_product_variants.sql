-- Flyway migration V19: product variant foundation

CREATE TABLE IF NOT EXISTS product_variants (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    variant_name VARCHAR(100) NOT NULL,
    variant_value VARCHAR(150) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL,
    sku VARCHAR(120) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM'
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_product_variants_product'
    ) THEN
        ALTER TABLE product_variants
            ADD CONSTRAINT fk_product_variants_product
            FOREIGN KEY (product_id)
            REFERENCES products(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
    ON product_variants(product_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_product_variants_sku
    ON product_variants(LOWER(sku));

ALTER TABLE product_variants
    DROP CONSTRAINT IF EXISTS chk_product_variants_stock_non_negative;

ALTER TABLE product_variants
    ADD CONSTRAINT chk_product_variants_stock_non_negative
    CHECK (stock >= 0);

