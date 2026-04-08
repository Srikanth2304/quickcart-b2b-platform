package com.quickcart.backend.controller;

import com.quickcart.backend.dto.*;
import com.quickcart.backend.service.BrandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/brands")
@RequiredArgsConstructor
public class BrandController {

    private final BrandService brandService;

    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<BulkCreateBrandsResponse>> createBrandsBulk(
            @Valid @RequestBody BulkCreateBrandsRequest request
    ) {
        return ResponseEntity.status(201).body(
                ApiResponse.success("Created successfully", brandService.createBrandsBulk(request))
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<BrandResponse>>> getBrands() {
        return ResponseEntity.ok(ApiResponse.success("Operation successful", brandService.getActiveBrands()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BrandResponse>> getBrandById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Operation successful", brandService.getActiveBrandById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<BrandResponse>> updateBrand(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBrandRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Updated successfully", brandService.updateBrand(id, request)));
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<ApiResponse<Void>> deactivateBrand(@PathVariable Long id) {
        brandService.deactivateBrand(id);
        return ResponseEntity.ok(ApiResponse.success("Deactivated successfully", null));
    }
}
