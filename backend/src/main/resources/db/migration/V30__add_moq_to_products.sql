-- Flyway migration V30: align products table with Product.moq mapping

ALTER TABLE products
    ADD COLUMN IF NOT EXISTS moq INTEGER;

UPDATE products
SET moq = 1
WHERE moq IS NULL;

ALTER TABLE products
    ALTER COLUMN moq SET DEFAULT 1;

ALTER TABLE products
    ALTER COLUMN moq SET NOT NULL;

ALTER TABLE products
    DROP CONSTRAINT IF EXISTS chk_products_moq_positive;

ALTER TABLE products
    ADD CONSTRAINT chk_products_moq_positive
    CHECK (moq >= 1);

