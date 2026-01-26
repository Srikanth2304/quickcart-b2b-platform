package com.quickcart.backend.config;

import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(RazorpayProperties.class)
@RequiredArgsConstructor
@Slf4j
public class RazorpayConfig {

    private final RazorpayProperties props;

    @Bean
    public RazorpayClient razorpayClient() {
        try {
            // The SDK uses these credentials for all order/refund calls.
            return new RazorpayClient(props.getKeyId(), props.getKeySecret());
        } catch (RazorpayException ex) {
            throw new IllegalStateException(
                    "Failed to initialize RazorpayClient. Ensure APP_RAZORPAY_KEY_ID and APP_RAZORPAY_KEY_SECRET are set.",
                    ex
            );
        }
    }
}
