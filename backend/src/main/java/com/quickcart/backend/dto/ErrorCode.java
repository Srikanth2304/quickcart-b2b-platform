package com.quickcart.backend.dto;

/**
 * Standardized error codes for the application.
 * Used to provide consistent error identification across the API.
 */
public enum ErrorCode {
    ORDER_ALREADY_PAID("ORDER_ALREADY_PAID"),
    INVALID_ORDER_STATUS("INVALID_ORDER_STATUS"),
    ORDER_ACCESS_DENIED("ORDER_ACCESS_DENIED"),
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND"),
    EMAIL_ALREADY_EXISTS("EMAIL_ALREADY_EXISTS"),
    INSUFFICIENT_STOCK("INSUFFICIENT_STOCK"),
    VALIDATION_FAILED("VALIDATION_FAILED"),
    UNAUTHORIZED("UNAUTHORIZED"),
    FORBIDDEN("FORBIDDEN"),
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR");

    private final String code;

    ErrorCode(String code) {
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

