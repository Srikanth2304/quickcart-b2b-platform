package com.quickcart.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateProductVariantRequest {

    @NotBlank(message = "Variant name is required")
    private String variantName;

    @NotBlank(message = "Variant value is required")
    private String variantValue;

    @NotNull(message = "Variant price is required")
    @Positive(message = "Variant price must be greater than 0")
    private BigDecimal price;

    @NotNull(message = "Variant stock is required")
    @Min(value = 0, message = "Variant stock cannot be negative")
    private Integer stock;
}
