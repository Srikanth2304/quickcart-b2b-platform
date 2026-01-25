package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateShipmentRequest {

    @NotBlank(message = "Carrier is required")
    @Size(max = 100, message = "Carrier must be <= 100 characters")
    private String carrier;

    @NotBlank(message = "Tracking number is required")
    @Size(max = 100, message = "Tracking number must be <= 100 characters")
    private String trackingNumber;

    @Size(max = 500, message = "Tracking URL must be <= 500 characters")
    private String trackingUrl;
}

