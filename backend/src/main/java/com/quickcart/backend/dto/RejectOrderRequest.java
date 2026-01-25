package com.quickcart.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RejectOrderRequest {

    /**
     * Optional reason recorded into the audit trail.
     * Keep it short to avoid storing huge free-form text.
     */
    @Size(max = 500, message = "Reject reason must be <= 500 characters")
    private String reason;
}

