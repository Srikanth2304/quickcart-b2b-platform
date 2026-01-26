package com.quickcart.backend.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.razorpay")
public class RazorpayProperties {
    /**
     * Razorpay key id (public identifier). Do not hardcode in committed config.
     */
    private String keyId;

    /**
     * Razorpay key secret. Do not hardcode in committed config.
     */
    private String keySecret;

    /**
     * Default currency used for Razorpay order creation.
     */
    private String currency = "INR";

    /**
     * Optional: if set, the created Razorpay order will include a receipt.
     */
    private String receiptPrefix = "qc";
}

