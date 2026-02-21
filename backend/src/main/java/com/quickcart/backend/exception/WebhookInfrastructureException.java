package com.quickcart.backend.exception;

/**
 * Thrown by webhook processing when an infrastructure-level failure occurs
 * (DB down, transaction failure, connection timeout, etc.).
 *
 * The webhook controller should return 5xx for this so the payment gateway retries delivery.
 * Business-logic errors (e.g., unknown entity, invalid state) should NOT use this exception —
 * those are handled gracefully and return 2xx to prevent infinite retries.
 */
public class WebhookInfrastructureException extends RuntimeException {

    public WebhookInfrastructureException(String message, Throwable cause) {
        super(message, cause);
    }
}

