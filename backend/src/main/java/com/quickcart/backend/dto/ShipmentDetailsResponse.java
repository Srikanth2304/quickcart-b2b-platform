package com.quickcart.backend.dto;

import com.quickcart.backend.entity.ShipmentStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ShipmentDetailsResponse {
    private Long id;
    private Long orderId;
    private String trackingNumber;
    private String carrierName;
    private String trackingUrl;
    private ShipmentStatus shipmentStatus;
    private LocalDateTime shippedAt;
    private LocalDateTime estimatedDeliveryDate;
    private LocalDateTime deliveredAt;
    private String failureReason;
    private String deliveryConfirmedBy;
    private String deliveryProofUrl;
}
