package com.quickcart.backend.exception;

/**
 * Exception thrown when a user tries to access a resource they don't have permission for.
 */
public class AccessDeniedException extends ApplicationException {

    public AccessDeniedException(String message) {
        super(message);
    }

    public AccessDeniedException(String resourceType, Long resourceId) {
        super(String.format("Access denied to %s with id: %d", resourceType, resourceId));
    }
}

