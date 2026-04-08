package com.quickcart.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateProductVariantRequest {
    private String variantName;
    private String variantValue;

    @Positive(message = "Variant price must be greater than 0")
    private BigDecimal price;

    @Min(value = 0, message = "Variant stock cannot be negative")
    private Integer stock;
}
