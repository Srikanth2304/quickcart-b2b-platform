-- Flyway migration V28: itemized invoices + financial snapshot fields

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMP;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(40);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(120);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_name VARCHAR(120);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_email VARCHAR(150);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_phone VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_address_line1 VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_address_line2 VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_city VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_state VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_pincode VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_country VARCHAR(100);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(120);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_address_line1 VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_address_line2 VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';

UPDATE invoices
SET invoice_date = COALESCE(invoice_date, created_at),
    grand_total_amount = CASE WHEN grand_total_amount = 0 THEN amount ELSE grand_total_amount END,
    subtotal_amount = CASE WHEN subtotal_amount = 0 THEN amount ELSE subtotal_amount END,
    billing_country = COALESCE(billing_country, 'INDIA'),
    shipping_country = COALESCE(shipping_country, 'INDIA')
WHERE invoice_date IS NULL
   OR grand_total_amount = 0
   OR subtotal_amount = 0
   OR billing_country IS NULL
   OR shipping_country IS NULL;

ALTER TABLE invoices ALTER COLUMN invoice_date SET NOT NULL;

CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL,
    product_id BIGINT,
    product_name VARCHAR(180) NOT NULL,
    product_sku VARCHAR(100),
    quantity INT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    updated_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);

