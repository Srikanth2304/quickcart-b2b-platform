package com.quickcart.backend.exception;

/**
 * Thrown when an order has already been cancelled and the requested operation
 * cannot be performed.
 */
public class OrderAlreadyCancelledException extends ApplicationException {

    public OrderAlreadyCancelledException(Long orderId) {
        super("Order " + orderId + " has already been cancelled");
    }

    public OrderAlreadyCancelledException(String message) {
        super(message);
    }
}
