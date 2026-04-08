package com.quickcart.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkCreateBrandsRequest {

    @NotEmpty(message = "brands list cannot be empty")
    @Valid
    private List<BrandItem> brands;

    @Data
    public static class BrandItem {
        @NotEmpty(message = "brand name cannot be empty")
        private String name;

        private String slug;

        private String logoUrl;
    }
}
