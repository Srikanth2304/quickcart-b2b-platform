package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
public class CategoryTreeResponse {
    private Long id;
    private String name;
    private String slug;
    private Integer displayOrder;

    @Builder.Default
    private List<CategoryTreeResponse> children = new ArrayList<>();
}

