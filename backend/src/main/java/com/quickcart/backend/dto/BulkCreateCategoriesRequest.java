package com.quickcart.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkCreateCategoriesRequest {

    @NotEmpty(message = "categories list cannot be empty")
    @Valid
    private List<CategoryItem> categories;

    @Data
    public static class CategoryItem {
        /** Required */
        @NotEmpty(message = "category name cannot be empty")
        private String name;

        /** Optional: if not provided we generate from name */
        private String slug;
    }
}

