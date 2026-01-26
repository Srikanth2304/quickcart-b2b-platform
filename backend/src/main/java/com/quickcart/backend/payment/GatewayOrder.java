package com.quickcart.backend.payment;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GatewayOrder {
    private final String id;
    private final long amountMinor;
    private final String currency;
}

