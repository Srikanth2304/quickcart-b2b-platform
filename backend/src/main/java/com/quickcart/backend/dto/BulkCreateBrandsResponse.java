package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class BulkCreateBrandsResponse {
    private int createdCount;
    private int existingCount;
    private List<BrandResponse> created;
    private List<BrandResponse> existing;
}
