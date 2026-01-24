package com.quickcart.backend.repository;

import com.quickcart.backend.dto.ProductFacetsResponse;
import com.quickcart.backend.entity.User;

import java.math.BigDecimal;
import java.util.List;

public interface ProductFacetRepository {

    List<ProductFacetsResponse.CategoryFacet> getCategoryFacets(
            User user,
            String category,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal rating,
            Boolean inStock,
            Boolean featured,
            Boolean returnable,
            Boolean hasDiscountPrice,
            BigDecimal minDiscount
    );

    List<ProductFacetsResponse.BrandFacet> getBrandFacets(
            User user,
            String category,
            String brand,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal rating,
            Boolean inStock,
            Boolean featured,
            Boolean returnable,
            Boolean hasDiscountPrice,
            BigDecimal minDiscount
    );
}
