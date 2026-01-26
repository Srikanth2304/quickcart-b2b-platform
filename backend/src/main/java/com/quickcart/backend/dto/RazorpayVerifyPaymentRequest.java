package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RazorpayVerifyPaymentRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;

    @NotBlank(message = "razorpay_payment_id is required")
    private String razorpayPaymentId;

    @NotBlank(message = "razorpay_order_id is required")
    private String razorpayOrderId;

    @NotBlank(message = "razorpay_signature is required")
    private String razorpaySignature;
}

