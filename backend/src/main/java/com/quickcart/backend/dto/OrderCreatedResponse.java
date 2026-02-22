package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
public class OrderCreatedResponse {
    private final Long orderId;
    private final String status;
    private final String paymentMethod;
    private final BigDecimal totalAmount;
}
