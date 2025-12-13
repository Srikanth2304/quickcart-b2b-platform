package com.quickcart.backend.controller;

import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductResponse;
import com.quickcart.backend.dto.UpdateProductRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    // ✅ EXISTING - DO NOT CHANGE
    @PostMapping
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<String> createProduct(
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        productService.createProduct(request, currentUser.getUser());
        return ResponseEntity.ok("Product created successfully");
    }

    // ✅ NEW - STEP 3
    @GetMapping
    public ResponseEntity<List<ProductResponse>> listProducts(
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(
                productService.getProductsForUser(currentUser.getUser())
        );
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
