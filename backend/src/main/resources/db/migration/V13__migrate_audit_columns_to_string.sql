-- Flyway migration V13: migrate created_by / updated_by from BIGINT user FK to VARCHAR auditor identity
-- Reason: BaseAuditableEntity now stores auditor as String (email/SYSTEM) via Spring Data JPA auditing.

DO $$
DECLARE
    tbl TEXT;
    col TEXT;
    fk RECORD;
BEGIN
    FOR tbl IN SELECT UNNEST(ARRAY['addresses', 'orders', 'payments', 'refunds', 'invoices', 'users', 'products']) LOOP
        FOREACH col IN ARRAY ARRAY['created_by', 'updated_by'] LOOP
            -- Ensure column exists
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = tbl
                  AND column_name = col
            ) THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN %I VARCHAR(150)', tbl, col);
            END IF;

            -- Drop foreign keys on audit columns if present
            FOR fk IN
                SELECT tc.constraint_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                  ON tc.constraint_name = kcu.constraint_name
                 AND tc.table_schema = kcu.table_schema
                WHERE tc.table_schema = 'public'
                  AND tc.table_name = tbl
                  AND tc.constraint_type = 'FOREIGN KEY'
                  AND kcu.column_name = col
            LOOP
                EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', tbl, fk.constraint_name);
            END LOOP;

            -- Convert non-varchar audit columns to VARCHAR(150)
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = tbl
                  AND column_name = col
                  AND data_type <> 'character varying'
            ) THEN
                EXECUTE format(
                    'ALTER TABLE %I ALTER COLUMN %I TYPE VARCHAR(150) USING (' ||
                    'CASE WHEN %I IS NULL THEN NULL ' ||
                    'ELSE COALESCE((SELECT u.email FROM users u WHERE u.id = %I), ''LEGACY_USER_ID:'' || %I::text) END)',
                    tbl, col, col, col, col
                );
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Fill nulls with SYSTEM fallback and enforce non-null for audited entities
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT UNNEST(ARRAY['addresses', 'orders', 'payments', 'refunds', 'invoices', 'users', 'products']) LOOP
        EXECUTE format('UPDATE %I SET created_by = ''SYSTEM'' WHERE created_by IS NULL', tbl);
        EXECUTE format('UPDATE %I SET updated_by = ''SYSTEM'' WHERE updated_by IS NULL', tbl);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN created_by SET NOT NULL', tbl);
        EXECUTE format('ALTER TABLE %I ALTER COLUMN updated_by SET NOT NULL', tbl);
    END LOOP;
END $$;

-- Optional query-performance indexes for audit columns
CREATE INDEX IF NOT EXISTS idx_addresses_created_by ON addresses(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_refunds_created_by ON refunds(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);

