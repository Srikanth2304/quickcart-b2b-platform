package com.quickcart.backend.payment;

import java.math.BigDecimal;

public interface PaymentGatewayClient {

    PaymentGatewayType type();

    /**
     * Create an order in the payment gateway.
     *
     * @param amount amount in major currency units (e.g. INR rupees)
     * @param currency ISO currency code (e.g. INR)
     * @param receipt optional receipt id
     */
    GatewayOrder createOrder(BigDecimal amount, String currency, String receipt);

    /**
     * Verify that the gateway signature for a checkout is valid.
     */
    boolean verifySignature(String orderId, String paymentId, String signature);

    /**
     * Initiate a refund for a successful payment.
     *
     * @param paymentId gateway payment id
     * @param amount amount in major currency units (nullable means full refund)
     */
    GatewayRefund refundPayment(String paymentId, BigDecimal amount);
}

