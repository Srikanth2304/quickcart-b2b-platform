package com.quickcart.backend.dto;

import lombok.Data;

import java.util.List;

@Data
public class ProductImageUploadRequest {
    private List<String> imageUrls;
    private String thumbnailUrl;
}

