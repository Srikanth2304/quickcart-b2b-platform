package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateBrandRequest {

    @NotBlank(message = "Brand name is required")
    @Size(max = 120, message = "Brand name must be at most 120 characters")
    private String name;

    @Size(max = 120, message = "Slug must be at most 120 characters")
    private String slug;

    @Size(max = 500, message = "Logo URL must be at most 500 characters")
    private String logoUrl;

    private Boolean isActive;
}
