package com.quickcart.backend.exception;

public class RateLimitExceededException extends ApplicationException {
    public RateLimitExceededException(String message) {
        super(message);
    }
}

