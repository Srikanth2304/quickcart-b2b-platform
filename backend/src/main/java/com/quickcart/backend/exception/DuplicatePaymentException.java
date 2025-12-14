package com.quickcart.backend.exception;

/**
 * Exception thrown when attempting to create a payment for an order that already has a successful payment.
 */
public class DuplicatePaymentException extends ApplicationException {

    public DuplicatePaymentException(Long orderId) {
        super("Order with ID: " + orderId + " already has a successful payment");
    }

    public DuplicatePaymentException(String message) {
        super(message);
    }
}

