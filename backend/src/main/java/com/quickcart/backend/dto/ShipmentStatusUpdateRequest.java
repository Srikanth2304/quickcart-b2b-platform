package com.quickcart.backend.dto;

import com.quickcart.backend.entity.ShipmentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ShipmentStatusUpdateRequest {
    @NotNull
    private ShipmentStatus status;

    @Size(max = 10)
    private String deliveryOtp;

    @Size(max = 120)
    private String deliveryConfirmedBy;

    @Size(max = 500)
    private String deliveryProofUrl;

    @Size(max = 255)
    private String failureReason;
}
