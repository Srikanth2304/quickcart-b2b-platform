package com.quickcart.backend.payment;

import com.quickcart.backend.config.RazorpayProperties;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Refund;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
@RequiredArgsConstructor
public class RazorpayGatewayClient implements PaymentGatewayClient {

    private final RazorpayClient razorpayClient;
    private final RazorpayProperties props;

    @Override
    public PaymentGatewayType type() {
        return PaymentGatewayType.RAZORPAY;
    }

    @Override
    public GatewayOrder createOrder(BigDecimal amount, String currency, String receipt) {
        try {
            long amountMinor = toMinorUnits(amount);

            JSONObject request = new JSONObject();
            request.put("amount", amountMinor);
            request.put("currency", currency);
            if (receipt != null && !receipt.isBlank()) {
                request.put("receipt", receipt);
            }

            Order order = razorpayClient.orders.create(request);

            return GatewayOrder.builder()
                    .id(stringValue(order.get("id")))
                    .amountMinor(longValue(order.get("amount")))
                    .currency(stringValue(order.get("currency")))
                    .build();
        } catch (RazorpayException ex) {
            throw new PaymentGatewayException("Failed to create Razorpay order", ex);
        }
    }

    @Override
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(options, props.getKeySecret());
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public GatewayRefund refundPayment(String paymentId, BigDecimal amount) {
        try {
            JSONObject request = new JSONObject();
            if (amount != null) {
                request.put("amount", toMinorUnits(amount));
            }

            Refund refund = razorpayClient.payments.refund(paymentId, request);

            return GatewayRefund.builder()
                    .id(stringValue(refund.get("id")))
                    .status(stringValue(refund.get("status")))
                    .build();
        } catch (RazorpayException ex) {
            throw new PaymentGatewayException("Failed to initiate Razorpay refund", ex);
        }
    }

    private static long toMinorUnits(BigDecimal amount) {
        return amount.movePointRight(2).longValueExact();
    }

    private static long longValue(Object value) {
        if (value == null) {
            throw new IllegalStateException("Expected numeric value but got null");
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        // Defensive: some SDKs return numeric values as strings
        return Long.parseLong(value.toString());
    }

    private static String stringValue(Object value) {
        return value == null ? null : value.toString();
    }
}
