-- Flyway migration V2: Patch existing DBs where `addresses` already existed
-- Adds soft-delete columns, auditing columns, constraints, and indexes safely.
-- This is designed to fix schema-validation errors like: missing column deleted_at in table addresses.

-- Ensure columns exist (safe for already-upgraded DBs)
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

ALTER TABLE addresses ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS created_by BIGINT NULL;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS updated_by BIGINT NULL;

-- Constraints (add only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_addresses_user'
      AND table_name = 'addresses'
  ) THEN
    ALTER TABLE addresses
      ADD CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_addresses_created_by'
      AND table_name = 'addresses'
  ) THEN
    ALTER TABLE addresses
      ADD CONSTRAINT fk_addresses_created_by FOREIGN KEY (created_by) REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_addresses_updated_by'
      AND table_name = 'addresses'
      ) THEN
    ALTER TABLE addresses
      ADD CONSTRAINT fk_addresses_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);
  END IF;
END $$;

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_active ON addresses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_addresses_user_default ON addresses(user_id, is_default);

-- Enforce only one default address per user (active only)
CREATE UNIQUE INDEX IF NOT EXISTS ux_addresses_one_default_per_user
ON addresses(user_id)
WHERE is_default = true AND is_active = true;

