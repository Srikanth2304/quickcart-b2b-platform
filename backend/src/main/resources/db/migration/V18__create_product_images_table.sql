-- Flyway migration V18: multi-image support for products

CREATE TABLE IF NOT EXISTS product_images (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INT,
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
        WHERE conname = 'fk_product_images_product'
    ) THEN
        ALTER TABLE product_images
            ADD CONSTRAINT fk_product_images_product
            FOREIGN KEY (product_id)
            REFERENCES products(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_product_images_product_id
    ON product_images(product_id);

