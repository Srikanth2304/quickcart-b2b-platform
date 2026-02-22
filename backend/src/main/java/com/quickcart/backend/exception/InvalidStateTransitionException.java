package com.quickcart.backend.exception;

/**
 * Thrown when an order status transition is not allowed by the business rules.
 * E.g., trying to ship a CONFIRMED order (must be ACCEPTED first).
 */
public class InvalidStateTransitionException extends ApplicationException {

    public InvalidStateTransitionException(String fromStatus, String toStatus) {
        super("Invalid state transition from " + fromStatus + " to " + toStatus);
    }

    public InvalidStateTransitionException(String message) {
        super(message);
    }
}
