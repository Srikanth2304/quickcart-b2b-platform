package com.quickcart.backend.payment;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GatewayRefund {
    private final String id;
    private final String status;
}
