package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BulkCreateCategoriesResponse {

    private int createdCount;
    private int existingCount;
    private List<CategoryResponse> created;
    private List<CategoryResponse> existing;
}

