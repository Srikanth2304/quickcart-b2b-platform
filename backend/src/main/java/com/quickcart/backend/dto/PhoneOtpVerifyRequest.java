package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RoleType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PhoneOtpVerifyRequest {
    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    @NotBlank(message = "OTP is required")
    private String otp;

    private String name;
    private RoleType role;
}

