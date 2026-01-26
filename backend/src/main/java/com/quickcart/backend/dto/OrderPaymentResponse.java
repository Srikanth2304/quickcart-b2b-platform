package com.quickcart.backend.dto;

import com.quickcart.backend.entity.PaymentGateway;
import com.quickcart.backend.entity.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderPaymentResponse {
    /**
     * Public payment identifier for UI/reference.
     * We expose the gateway payment id (e.g., Razorpay payment id) when available.
     *
     * NOTE: Not exposing any secrets.
     */
    private String paymentId;

    private PaymentStatus status;

    private PaymentGateway gateway;
}

