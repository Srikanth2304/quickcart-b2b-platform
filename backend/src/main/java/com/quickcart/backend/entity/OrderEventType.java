package com.quickcart.backend.entity;

/**
 * High-level audit events for orders.
 *
 * This is intentionally separate from OrderStatus so we can log events that do not change status
 * (e.g., PAYMENT_CREATED, INVOICE_GENERATED).
 */
public enum OrderEventType {
    ORDER_PLACED,
    STATUS_CHANGED,
    PAYMENT_CREATED,
    INVOICE_GENERATED,
    ORDER_CANCELLED,
    REFUND_REQUESTED,
    REFUND_APPROVED,
    REFUND_PROCESSING,
    REFUND_REJECTED,
    REFUND_PROCESSED
}
