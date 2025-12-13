package com.quickcart.backend.exception;

/**
 * Exception thrown when attempting to register with an email that already exists.
 */
public class EmailAlreadyExistsException extends ApplicationException {

    public EmailAlreadyExistsException(String email) {
        super("Email already exists: " + email);
    }
}

