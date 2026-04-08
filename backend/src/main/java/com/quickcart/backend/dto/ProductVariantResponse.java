package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ProductVariantResponse {
    private Long id;
    private Long productId;
    private String variantName;
    private String variantValue;
    private BigDecimal price;
    private Integer stock;
    private String sku;
}
