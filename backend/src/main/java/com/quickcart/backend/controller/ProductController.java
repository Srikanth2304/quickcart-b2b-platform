package com.quickcart.backend.controller;

import com.quickcart.backend.dto.BulkCreateProductsRequest;
import com.quickcart.backend.dto.BulkCreateProductsResponse;
import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductDetailsResponse;
import com.quickcart.backend.dto.ProductListResponse;
import com.quickcart.backend.dto.UpdateProductRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> createProduct(
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        productService.createProduct(request, currentUser.getUser());
        return ResponseEntity.ok("Product created successfully");
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<BulkCreateProductsResponse> createProductsBulk(
            @Valid @RequestBody BulkCreateProductsRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(201).body(
                productService.createProductsBulk(request, currentUser.getUser())
        );
    }

    @GetMapping
    public ResponseEntity<Page<ProductListResponse>> listProducts(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            Pageable pageable
    ) {
        return ResponseEntity.ok(
                productService.getProductListForUser(currentUser.getUser(), pageable)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailsResponse> getProductById(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(productService.getProductDetailsByIdForUser(id, currentUser.getUser()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProductRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        productService.updateProduct(id, request, currentUser.getUser());
        return ResponseEntity.ok("Product updated successfully");
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> deactivateProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        productService.deactivateProduct(id, currentUser.getUser());
        return ResponseEntity.ok("Product deactivated successfully");
    }
}
