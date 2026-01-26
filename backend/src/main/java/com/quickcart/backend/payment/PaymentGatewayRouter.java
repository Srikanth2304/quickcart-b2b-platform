package com.quickcart.backend.payment;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PaymentGatewayRouter {

    private final List<PaymentGatewayClient> clients;

    public PaymentGatewayRouter(List<PaymentGatewayClient> clients) {
        this.clients = clients;
    }

    public PaymentGatewayClient razorpay() {
        return clients.stream()
                .filter(c -> c.type() == PaymentGatewayType.RAZORPAY)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("Razorpay gateway client not configured"));
    }
}
