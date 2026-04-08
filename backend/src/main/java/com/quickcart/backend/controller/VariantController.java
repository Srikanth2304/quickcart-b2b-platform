package com.quickcart.backend.controller;

import com.quickcart.backend.dto.ApiResponse;
import com.quickcart.backend.dto.ProductVariantResponse;
import com.quickcart.backend.dto.UpdateProductVariantRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/variants")
@RequiredArgsConstructor
public class VariantController {

    private final ProductService productService;

    @PatchMapping("/{variantId}")
    @PreAuthorize("hasRole('MANUFACTURER')")
    public ResponseEntity<ApiResponse<ProductVariantResponse>> updateVariant(
            @PathVariable Long variantId,
            @Valid @RequestBody UpdateProductVariantRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(
                ApiResponse.success("Updated successfully", productService.updateVariant(variantId, request, currentUser.getUser()))
        );
    }
}
