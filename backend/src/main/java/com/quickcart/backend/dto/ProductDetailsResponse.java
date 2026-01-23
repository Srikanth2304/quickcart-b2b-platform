package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductDetailsResponse {

    private Long id;
    private String name;
    private String description;
    private String shortDescription;

    private String brand;
    private String sku;

    private BigDecimal price;
    private BigDecimal mrp;
    private BigDecimal discountPrice;

    private String thumbnailUrl;

    private BigDecimal rating;
    private Integer reviewCount;

    private Boolean isFeatured;
    private Boolean isReturnable;
    private Integer warrantyMonths;

    private Integer stock;
    private String status;

    private Long manufacturerId;
    private String manufacturerName;

    private Long categoryId;
    private CategoryResponse category;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
