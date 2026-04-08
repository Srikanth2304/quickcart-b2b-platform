-- Flyway migration V23: dedicated shipments + return workflow

CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE,
    tracking_number VARCHAR(100),
    carrier_name VARCHAR(100),
    tracking_url VARCHAR(300),
    shipment_status VARCHAR(50) NOT NULL,
    shipped_at TIMESTAMP,
    estimated_delivery_date TIMESTAMP,
    delivered_at TIMESTAMP,
    failure_reason VARCHAR(255),
    delivery_otp VARCHAR(10),
    delivery_confirmed_by VARCHAR(120),
    delivery_proof_url VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT fk_shipments_order FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(shipment_status);

ALTER TABLE shipments
    DROP CONSTRAINT IF EXISTS chk_shipments_status;
ALTER TABLE shipments
    ADD CONSTRAINT chk_shipments_status
    CHECK (shipment_status IN ('CREATED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','FAILED','RTO'));

-- Backward compatibility data migration from legacy order shipment columns.
INSERT INTO shipments (
    order_id,
    tracking_number,
    carrier_name,
    tracking_url,
    shipment_status,
    shipped_at,
    delivered_at,
    failure_reason
)
SELECT
    o.id,
    NULLIF(TRIM(o.shipment_tracking_number), ''),
    NULLIF(TRIM(o.shipment_carrier), ''),
    NULLIF(TRIM(o.shipment_tracking_url), ''),
    CASE
        WHEN o.delivered_at IS NOT NULL THEN 'DELIVERED'
        WHEN o.shipped_at IS NOT NULL THEN 'SHIPPED'
        ELSE 'CREATED'
    END,
    o.shipped_at,
    o.delivered_at,
    NULL
FROM orders o
WHERE (o.shipped_at IS NOT NULL OR o.delivered_at IS NOT NULL
       OR o.shipment_tracking_number IS NOT NULL OR o.shipment_carrier IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM shipments s WHERE s.order_id = o.id
  );

CREATE TABLE IF NOT EXISTS return_requests (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    order_item_id BIGINT NOT NULL,
    reason VARCHAR(500),
    return_status VARCHAR(50) NOT NULL,
    requested_at TIMESTAMP NOT NULL,
    approved_at TIMESTAMP,
    received_at TIMESTAMP,
    inspection_status VARCHAR(50),
    refund_status VARCHAR(50),
    quantity INT NOT NULL DEFAULT 1,
    rejection_reason VARCHAR(500),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(150) NOT NULL DEFAULT 'SYSTEM',
    CONSTRAINT fk_return_requests_order FOREIGN KEY (order_id) REFERENCES orders(id),
    CONSTRAINT fk_return_requests_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id)
);

CREATE INDEX IF NOT EXISTS idx_return_requests_order_id ON return_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(return_status);

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_status;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_status
    CHECK (return_status IN ('REQUESTED','APPROVED','REJECTED','PICKUP_SCHEDULED','PICKED_UP','RECEIVED','INSPECTED','COMPLETED'));

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_inspection_status;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_inspection_status
    CHECK (inspection_status IS NULL OR inspection_status IN ('PENDING','PASSED','FAILED'));

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_refund_status;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_refund_status
    CHECK (refund_status IS NULL OR refund_status IN ('NOT_REQUIRED','PENDING','PROCESSING','PROCESSED','FAILED'));

ALTER TABLE return_requests
    DROP CONSTRAINT IF EXISTS chk_return_requests_quantity_positive;
ALTER TABLE return_requests
    ADD CONSTRAINT chk_return_requests_quantity_positive
    CHECK (quantity > 0);

