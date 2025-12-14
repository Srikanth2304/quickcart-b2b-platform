package com.quickcart.backend.exception;

/**
 * Exception thrown when a user tries to access or pay for an order that doesn't belong to them.
 */
public class OrderAccessDeniedException extends ApplicationException {

    public OrderAccessDeniedException(String message) {
        super(message);
    }

    public OrderAccessDeniedException(Long orderId) {
        super("You do not have permission to access or pay for order with ID: " + orderId);
    }
}

