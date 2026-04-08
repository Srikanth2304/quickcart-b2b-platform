-- Flyway migration V16: categories hierarchy, lifecycle, display order, and slug integrity

-- 1) Add hierarchy/lifecycle/ordering columns (safe for existing rows)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id BIGINT NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- 2) Ensure existing records are active by default
UPDATE categories
SET is_active = TRUE
WHERE is_active IS NULL;

-- 3) Add self-referencing FK for category tree
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_category_parent'
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT fk_category_parent
            FOREIGN KEY (parent_id)
            REFERENCES categories(id);
    END IF;
END $$;

-- 4) Normalize potential duplicate slugs before creating unique lower(slug) index
WITH ranked AS (
    SELECT id,
           slug,
           LOWER(slug) AS slug_lower,
           ROW_NUMBER() OVER (PARTITION BY LOWER(slug) ORDER BY id) AS rn
    FROM categories
    WHERE slug IS NOT NULL
)
UPDATE categories c
SET slug = c.slug || '-' || c.id
FROM ranked r
WHERE c.id = r.id
  AND r.rn > 1;

-- 5) Enforce case-insensitive slug uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS uk_category_slug_lower
    ON categories (LOWER(slug));

-- 6) Prevent invalid self-parent assignment
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_parent_not_self'
    ) THEN
        ALTER TABLE categories
            ADD CONSTRAINT chk_parent_not_self
            CHECK (parent_id IS NULL OR parent_id <> id);
    END IF;
END $$;

-- 7) Helpful index for parent traversal
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

