package com.quickcart.backend.controller;

import com.quickcart.backend.dto.BulkCreateCategoriesRequest;
import com.quickcart.backend.dto.BulkCreateCategoriesResponse;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * Bulk create categories.
     *
     * Admin/Catalog-only operation: categories affect the entire marketplace taxonomy and filters.
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasAnyRole('ADMIN','CATALOG_MANAGER')")
    public ResponseEntity<BulkCreateCategoriesResponse> createCategoriesBulk(
            @Valid @RequestBody BulkCreateCategoriesRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.status(201).body(
                categoryService.createCategoriesBulk(request, currentUser.getUser())
        );
    }
}
