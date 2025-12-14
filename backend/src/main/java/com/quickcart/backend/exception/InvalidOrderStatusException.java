package com.quickcart.backend.exception;

/**
 * Exception thrown when attempting to make a payment for an order with invalid status.
 */
public class InvalidOrderStatusException extends ApplicationException {

    public InvalidOrderStatusException(Long orderId, String currentStatus) {
        super("Order with ID: " + orderId + " has status '" + currentStatus + "' but must be 'CREATED' to process payment");
    }

    public InvalidOrderStatusException(String message) {
        super(message);
    }
}

