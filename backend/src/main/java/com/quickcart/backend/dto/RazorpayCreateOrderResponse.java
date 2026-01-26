package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class RazorpayCreateOrderResponse {
    private final Long orderId;
    private final String razorpayOrderId;
    private final BigDecimal amount;
    private final String currency;
}

