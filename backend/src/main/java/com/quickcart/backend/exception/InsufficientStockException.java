package com.quickcart.backend.exception;

/**
 * Exception thrown when attempting to order more items than available in stock.
 */
public class InsufficientStockException extends ApplicationException {

    public InsufficientStockException(String productName, Integer requested, Integer available) {
        super(String.format("Insufficient stock for product '%s'. Requested: %d, Available: %d",
            productName, requested, available));
    }

    public InsufficientStockException(String message) {
        super(message);
    }
}

