package com.quickcart.backend.exception;

import org.springframework.http.HttpStatus;

/**
 * Generic business exception that carries an API error code and preferred HTTP status.
 */
public class CustomBusinessException extends RuntimeException {
    private final String errorCode;
    private final HttpStatus httpStatus;

    public CustomBusinessException(String message, String errorCode, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.httpStatus = httpStatus;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}

