package com.quickcart.backend.exception;

/**
 * Base exception class for all application-specific exceptions.
 * Extends RuntimeException to avoid forcing try-catch blocks throughout the code.
 */
public class ApplicationException extends RuntimeException {

    public ApplicationException(String message) {
        super(message);
    }

    public ApplicationException(String message, Throwable cause) {
        super(message, cause);
    }
}

