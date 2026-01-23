package com.quickcart.backend.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateProductRequest {

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;

    private String shortDescription;

    private String brand;

    private String sku;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be greater than 0")
    private BigDecimal price;

    private BigDecimal mrp;

    private BigDecimal discountPrice;

    private String thumbnailUrl;

    private BigDecimal rating;

    private Integer reviewCount;

    private Boolean isFeatured;

    private Boolean isReturnable;

    private Integer warrantyMonths;

    private Long categoryId;

    @NotNull(message = "Stock is required")
    @Min(value = 0)
    private Integer stock;
}