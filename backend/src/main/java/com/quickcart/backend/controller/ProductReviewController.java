package com.quickcart.backend.controller;

import com.quickcart.backend.dto.MessageResponse;
import com.quickcart.backend.dto.ProductReviewResponse;
import com.quickcart.backend.dto.UpsertProductReviewRequest;
import com.quickcart.backend.security.CustomUserDetails;
import com.quickcart.backend.service.ProductReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/products/{productId}/reviews")
@RequiredArgsConstructor
public class ProductReviewController {

    private final ProductReviewService productReviewService;

    @GetMapping
    public ResponseEntity<Page<ProductReviewResponse>> listReviews(
            @PathVariable Long productId,
            Pageable pageable
    ) {
        return ResponseEntity.ok(productReviewService.listReviews(productId, pageable));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ProductReviewResponse> getMyReview(
            @PathVariable Long productId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        return ResponseEntity.ok(productReviewService.getMyReview(productId, currentUser.getUser()));
    }

    @PutMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageResponse> upsertMyReview(
            @PathVariable Long productId,
            @Valid @RequestBody UpsertProductReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        productReviewService.upsertReview(productId, currentUser.getUser(), request);
        return ResponseEntity.ok(MessageResponse.builder().message("Review saved successfully").build());
    }

    @DeleteMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageResponse> deleteMyReview(
            @PathVariable Long productId,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        productReviewService.deleteMyReview(productId, currentUser.getUser());
        return ResponseEntity.ok(MessageResponse.builder().message("Review deleted successfully").build());
    }
}
