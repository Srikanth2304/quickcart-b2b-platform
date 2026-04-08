-- Flyway migration V14: align categories audit columns with string-based JPA auditing
-- Category now inherits BaseAuditableEntity and expects created_by/updated_by as VARCHAR(150).

DO $$
DECLARE
    fk RECORD;
BEGIN
    -- Ensure audit columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE categories ADD COLUMN created_by VARCHAR(150);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE categories ADD COLUMN updated_by VARCHAR(150);
    END IF;

    -- Drop FK constraints tied to old BIGINT user references
    FOR fk IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'categories'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name IN ('created_by', 'updated_by')
    LOOP
        EXECUTE format('ALTER TABLE categories DROP CONSTRAINT IF EXISTS %I', fk.constraint_name);
    END LOOP;

    -- Convert column types if still numeric/other
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'categories'
          AND column_name = 'created_by'
          AND data_type <> 'character varying'
    ) THEN
        ALTER TABLE categories
            ALTER COLUMN created_by TYPE VARCHAR(150)
            USING (
                CASE
                    WHEN created_by IS NULL THEN NULL
                    ELSE COALESCE((SELECT u.email FROM users u WHERE u.id = created_by), 'LEGACY_USER_ID:' || created_by::text)
                END
            );
    END IF;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'categories'
          AND column_name = 'updated_by'
          AND data_type <> 'character varying'
    ) THEN
        ALTER TABLE categories
            ALTER COLUMN updated_by TYPE VARCHAR(150)
            USING (
                CASE
                    WHEN updated_by IS NULL THEN NULL
                    ELSE COALESCE((SELECT u.email FROM users u WHERE u.id = updated_by), 'LEGACY_USER_ID:' || updated_by::text)
                END
            );
    END IF;
END $$;

-- Apply non-null defaults for auditing compatibility
UPDATE categories SET created_by = 'SYSTEM' WHERE created_by IS NULL;
UPDATE categories SET updated_by = 'SYSTEM' WHERE updated_by IS NULL;

ALTER TABLE categories ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE categories ALTER COLUMN updated_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);

