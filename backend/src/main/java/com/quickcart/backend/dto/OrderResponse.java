package com.quickcart.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private Long id;
    private String status;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;

    /**
     * Payment details for this order (nullable).
     * - null when no payment record exists yet.
     */
    private OrderPaymentResponse payment;

    // Retailer info
    private String retailerName;
    private String retailerEmail;

    // Manufacturer info
    private String manufacturerName;
    private String manufacturerEmail;

    // Delivery snapshot
    private String deliveryName;
    private String deliveryPhone;
    private String deliveryAddressLine1;
    private String deliveryCity;
    private String deliveryState;
    private String deliveryPincode;

    // Shipment / tracking
    private String shipmentCarrier;
    private String shipmentTrackingNumber;
    private String shipmentTrackingUrl;
    private LocalDateTime shippedAt;
    private LocalDateTime deliveredAt;

    // Order items
    private List<OrderItemResponse> items;
}
