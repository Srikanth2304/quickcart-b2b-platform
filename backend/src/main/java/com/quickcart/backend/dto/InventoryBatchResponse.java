package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class InventoryBatchResponse {
    private Long id;
    private Long productId;
    private Long variantId;
    private String batchCode;
    private Integer quantity;
    private Integer remainingQuantity;
    private LocalDate expiryDate;
    private String supplierName;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
