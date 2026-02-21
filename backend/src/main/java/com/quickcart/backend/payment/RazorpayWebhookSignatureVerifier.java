package com.quickcart.backend.payment;

import com.quickcart.backend.config.RazorpayProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Verifies inbound Razorpay webhook signatures using HMAC-SHA256.
 *
 * Razorpay sends the signature in the {@code X-Razorpay-Signature} header.
 * Verification: HMAC-SHA256(webhookSecret, rawRequestBody) must match the header value.
 * Comparison is constant-time to prevent timing attacks.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RazorpayWebhookSignatureVerifier {

    private static final String HMAC_SHA256 = "HmacSHA256";

    private final RazorpayProperties razorpayProperties;

    /**
     * Verify a Razorpay webhook signature.
     *
     * @param rawBody   the raw HTTP request body bytes
     * @param signature the value of the X-Razorpay-Signature header
     * @return true if the signature is valid
     */
    public boolean isValid(byte[] rawBody, String signature) {
        if (rawBody == null || signature == null || signature.isBlank()) {
            return false;
        }

        String secret = razorpayProperties.getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            log.error("Razorpay webhook secret is not configured (app.razorpay.webhookSecret). "
                    + "Rejecting all webhook requests.");
            return false;
        }

        try {
            Mac mac = Mac.getInstance(HMAC_SHA256);
            SecretKeySpec keySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256);
            mac.init(keySpec);

            byte[] computed = mac.doFinal(rawBody);
            String computedHex = bytesToHex(computed);

            // Constant-time comparison to prevent timing attacks
            return MessageDigest.isEqual(
                    computedHex.getBytes(StandardCharsets.UTF_8),
                    signature.getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception ex) {
            log.error("Webhook signature verification failed unexpectedly", ex);
            return false;
        }
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}

