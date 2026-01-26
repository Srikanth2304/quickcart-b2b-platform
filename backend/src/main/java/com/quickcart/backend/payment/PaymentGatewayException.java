package com.quickcart.backend.payment;

public class PaymentGatewayException extends RuntimeException {
    public PaymentGatewayException(String message, Throwable cause) {
        super(message, cause);
    }
}

