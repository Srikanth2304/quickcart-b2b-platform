package com.quickcart.backend.exception;

public class InvalidPaymentSignatureException extends ApplicationException {
    public InvalidPaymentSignatureException() {
        super("Invalid payment signature");
    }
}
