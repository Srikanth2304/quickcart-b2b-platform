package com.quickcart.backend.entity;


public enum PaymentStatus {
    INITIATED,
    SUCCESS,
    FAILED,
    PENDING_COLLECTION,
    COLLECTED,
    REFUND_PENDING,
    REFUNDED,
    REFUND_FAILED
}
