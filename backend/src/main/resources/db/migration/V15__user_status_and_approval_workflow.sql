-- Flyway migration V15: user lifecycle states + soft delete metadata

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

UPDATE users
SET status = CASE
    WHEN COALESCE(is_active, true) = true THEN 'ACTIVE'
    ELSE 'INACTIVE'
END
WHERE status IS NULL;

ALTER TABLE users
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(150);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_status') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_status
            CHECK (status IN ('PENDING','ACTIVE','INACTIVE','SUSPENDED'))
            NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

