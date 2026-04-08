package com.quickcart.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateInventoryBatchRequest {

    @NotNull(message = "productId is required")
    private Long productId;

    private Long variantId;

    @NotBlank(message = "batchCode is required")
    private String batchCode;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be greater than 0")
    private Integer quantity;

    private LocalDate expiryDate;

    private String supplierName;
}
