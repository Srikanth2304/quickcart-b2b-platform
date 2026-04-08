-- Flyway migration V17: global brands + product brand normalization + sku uniqueness

-- 1) Create brands table
CREATE TABLE IF NOT EXISTS brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    logo_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM'
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_brand_slug
    ON brands (LOWER(slug));

-- 2) Add brand_id to products (keep old products.brand column for compatibility)
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_product_brand'
    ) THEN
        ALTER TABLE products
            ADD CONSTRAINT fk_product_brand
            FOREIGN KEY (brand_id)
            REFERENCES brands(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- 3) Backfill brands from existing products.brand values
INSERT INTO brands (name, slug, is_active, created_at, updated_at, created_by, updated_by)
SELECT
    src.brand_name,
    src.brand_slug,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    'MIGRATION_V17',
    'MIGRATION_V17'
FROM (
    SELECT DISTINCT
        TRIM(p.brand) AS brand_name,
        regexp_replace(lower(TRIM(p.brand)), '[^a-z0-9]+', '-', 'g') AS brand_slug
    FROM products p
    WHERE p.brand IS NOT NULL
      AND TRIM(p.brand) <> ''
) src
WHERE src.brand_slug IS NOT NULL
  AND src.brand_slug <> ''
ON CONFLICT DO NOTHING;

-- 4) Map products.brand -> products.brand_id using normalized slug matching
UPDATE products p
SET brand_id = b.id
FROM brands b
WHERE p.brand_id IS NULL
  AND p.brand IS NOT NULL
  AND TRIM(p.brand) <> ''
  AND b.slug = regexp_replace(lower(TRIM(p.brand)), '[^a-z0-9]+', '-', 'g');

-- 5) Enforce SKU uniqueness for generated SKUs
CREATE UNIQUE INDEX IF NOT EXISTS uk_product_sku
    ON products (LOWER(sku))
    WHERE sku IS NOT NULL;

