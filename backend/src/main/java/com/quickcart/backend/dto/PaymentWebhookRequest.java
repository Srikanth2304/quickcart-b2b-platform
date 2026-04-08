package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PaymentWebhookRequest {

    @NotBlank(message = "eventType is required")
    private String eventType;

    private Long orderId;

    private String razorpayOrderId;

    private String razorpayPaymentId;

    private String failureReason;
}

