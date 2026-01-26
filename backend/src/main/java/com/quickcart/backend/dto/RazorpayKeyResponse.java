package com.quickcart.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RazorpayKeyResponse {
    /**
     * Razorpay public key id. Safe to expose to the frontend.
     */
    private String keyId;
}

