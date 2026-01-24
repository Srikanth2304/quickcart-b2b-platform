package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProductFacetsResponse {

    private List<CategoryFacet> categories;
    private List<BrandFacet> brands;

    @Data
    @Builder
    public static class CategoryFacet {
        private Long id;
        private String name;
        private String slug;
        private long count;
    }

    @Data
    @Builder
    public static class BrandFacet {
        private String value;
        private long count;
    }
}

