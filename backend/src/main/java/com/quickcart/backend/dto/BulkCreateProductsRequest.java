package com.quickcart.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class BulkCreateProductsRequest {

    @NotEmpty(message = "Products list cannot be empty")
    private List<@Valid CreateProductRequest> products;
}

