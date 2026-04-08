package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PhoneOtpRequest {
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;
}

