package com.quickcart.backend.dto;

import com.quickcart.backend.entity.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {
    private Long id;
    private Long orderId;
    private Long retailerId;
    private BigDecimal amount;
    private PaymentStatus status;
    private String paymentReference;
}

