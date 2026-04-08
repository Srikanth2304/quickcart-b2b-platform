package com.quickcart.backend.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateInventoryBatchRequest {

    @Min(value = 0, message = "remainingQuantity cannot be negative")
    private Integer remainingQuantity;

    private LocalDate expiryDate;

    private String supplierName;

    private Boolean isActive;
}
