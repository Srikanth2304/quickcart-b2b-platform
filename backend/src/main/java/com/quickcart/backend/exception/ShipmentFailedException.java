package com.quickcart.backend.exception;

public class ShipmentFailedException extends RuntimeException {
    public ShipmentFailedException(String message) {
        super(message);
    }
}
