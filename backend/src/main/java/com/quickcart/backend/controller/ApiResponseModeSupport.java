package com.quickcart.backend.controller;

import com.quickcart.backend.dto.ApiResponse;
import org.springframework.http.ResponseEntity;

/**
 * Utility to keep legacy raw responses while optionally returning wrapped responses.
 */
public final class ApiResponseModeSupport {

    private ApiResponseModeSupport() {
    }

    public static boolean isWrapped(String headerValue) {
        return headerValue != null && "true".equalsIgnoreCase(headerValue.trim());
    }

    public static ResponseEntity<Object> okMessage(String message, boolean wrapped) {
        if (wrapped) {
            return ResponseEntity.ok(ApiResponse.success(message, null));
        }
        return ResponseEntity.ok(message);
    }
}

