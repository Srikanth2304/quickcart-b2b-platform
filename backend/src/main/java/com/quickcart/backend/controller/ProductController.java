package com.quickcart.backend.controller;

import com.quickcart.backend.dto.BulkCreateProductsRequest;
import com.quickcart.backend.dto.BulkCreateProductsResponse;
import com.quickcart.backend.dto.CreateProductRequest;
import com.quickcart.backend.dto.ProductDetailsResponse;
import com.quickcart.backend.dto.ProductFacetsResponse;
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

import java.math.BigDecimal;

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
            Pageable pageable,
            /** category slug(s): "electronics" or "electronics,furniture" */
            @RequestParam(required = false) String category,
            /** exact brand match (case-insensitive) */
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            /** rating >= this value */
            @RequestParam(required = false) BigDecimal rating,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean returnable,
            /** true => discount_price is NOT NULL; false => discount_price IS NULL */
            @RequestParam(required = false) Boolean hasDiscountPrice,
            /** computed (mrp - price) >= minDiscount */
            @RequestParam(required = false) BigDecimal minDiscount
    ) {
        return ResponseEntity.ok(
                productService.getProductListForUser(
                        currentUser.getUser(),
                        pageable,
                        category,
                        brand,
                        minPrice,
                        maxPrice,
                        rating,
                        inStock,
                        featured,
                        returnable,
                        hasDiscountPrice,
                        minDiscount
                )
        );
    }

    /**
     * Facets endpoint for UI filters.
     * Returns category + brand counts across the full filtered dataset (not paginated).
     *
     * NOTE: For better multi-select UX, the backend intentionally does NOT apply the facet's own filter
     * when computing its counts (e.g., category facet ignores `category` filter; brand facet ignores `brand`).
     */
    @GetMapping("/facets")
    public ResponseEntity<ProductFacetsResponse> getProductFacets(
            @AuthenticationPrincipal CustomUserDetails currentUser,
            /** category slug(s): "electronics" or "electronics,furniture" */
            @RequestParam(required = false) String category,
            /** exact brand match (case-insensitive) */
            @RequestParam(required = false) String brand,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            /** rating >= this value */
            @RequestParam(required = false) BigDecimal rating,
            @RequestParam(required = false) Boolean inStock,
            @RequestParam(required = false) Boolean featured,
            @RequestParam(required = false) Boolean returnable,
            /** true => discount_price is NOT NULL; false => discount_price IS NULL */
            @RequestParam(required = false) Boolean hasDiscountPrice,
            /** computed (mrp - price) >= minDiscount */
            @RequestParam(required = false) BigDecimal minDiscount
    ) {
        return ResponseEntity.ok(
                productService.getProductFacetsForUser(
                        currentUser.getUser(),
                        category,
                        brand,
                        minPrice,
                        maxPrice,
                        rating,
                        inStock,
                        featured,
                        returnable,
                        hasDiscountPrice,
                        minDiscount
                )
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
