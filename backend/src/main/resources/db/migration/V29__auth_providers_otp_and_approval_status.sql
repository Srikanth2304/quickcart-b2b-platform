-- Flyway migration V29: unified auth providers + OTP fields + approval status alignment

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10),
    ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP,
    ADD COLUMN IF NOT EXISTS social_id VARCHAR(150),
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);

UPDATE users
SET auth_provider = COALESCE(auth_provider, 'LOCAL'),
    approval_status = COALESCE(approval_status,
        CASE
            WHEN status = 'ACTIVE' THEN 'ACTIVE'
            WHEN status = 'REJECTED' THEN 'REJECTED'
            ELSE 'PENDING'
        END
    );

ALTER TABLE users
    ALTER COLUMN auth_provider SET NOT NULL,
    ALTER COLUMN approval_status SET NOT NULL;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_status;

ALTER TABLE users
    ADD CONSTRAINT chk_users_status
    CHECK (status IN ('PENDING','ACTIVE','REJECTED','INACTIVE','SUSPENDED'))
    NOT VALID;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_auth_provider;

ALTER TABLE users
    ADD CONSTRAINT chk_users_auth_provider
    CHECK (auth_provider IN ('LOCAL','GOOGLE','GITHUB','PHONE_OTP','EMAIL_OTP'))
    NOT VALID;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_approval_status;

ALTER TABLE users
    ADD CONSTRAINT chk_users_approval_status
    CHECK (approval_status IN ('PENDING','ACTIVE','REJECTED'))
    NOT VALID;

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_social_id ON users(social_id);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

