package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateCategoryRequest {

    @NotBlank(message = "Category name is required")
    @Size(max = 150, message = "Category name must be at most 150 characters")
    private String name;

    @Size(max = 200, message = "Slug must be at most 200 characters")
    private String slug;

    private Long parentId;

    private Integer displayOrder;

    private Boolean isActive;
}

