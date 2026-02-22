package com.quickcart.backend.entity;

/**
 * How the order will be paid.
 *
 * ONLINE             – Payment via Razorpay (or other gateway) before fulfilment.
 * CASH_ON_DELIVERY   – Payment collected at delivery; no gateway interaction.
 */
public enum PaymentMethod {
    ONLINE,
    CASH_ON_DELIVERY
}

