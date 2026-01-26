package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ProductListResponse {

    private Long id;
    private String name;

    private String description;

    private String brand;

    /** UI-friendly thumbnail/image URL */
    private String imageUrl;

    private BigDecimal price;
    private BigDecimal mrp;

    /** discount amount (mrp - price) when both are present; otherwise 0 */
    private BigDecimal discount;

    /** discount percentage ( (mrp - price) / mrp * 100 ) when mrp and price are present; otherwise 0 */
    private BigDecimal discountPercent;

    private BigDecimal rating;
    private Integer reviewsCount;

    private Integer stock;
    private Boolean isInStock;

    /** Manufacturer info for list view (e.g., show “Sold by”). */
    private Long manufacturerId;
    private String manufacturerName;

    private Long categoryId;
    private CategoryResponse category;
}
