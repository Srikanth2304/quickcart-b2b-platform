package com.quickcart.backend.exception;

/**
 * Thrown when a payment has already been processed (SUCCESS/FAILED)
 * and a duplicate processing attempt is made.
 */
public class PaymentAlreadyProcessedException extends ApplicationException {

    public PaymentAlreadyProcessedException(Long orderId) {
        super("Payment for order " + orderId + " has already been processed");
    }

    public PaymentAlreadyProcessedException(String message) {
        super(message);
    }
}
