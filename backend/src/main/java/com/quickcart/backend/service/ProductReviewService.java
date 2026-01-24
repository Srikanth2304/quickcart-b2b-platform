package com.quickcart.backend.service;

import com.quickcart.backend.dto.ProductReviewResponse;
import com.quickcart.backend.dto.UpsertProductReviewRequest;
import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductReview;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.ProductRepository;
import com.quickcart.backend.repository.ProductReviewRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class ProductReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Upserts (insert/update) the authenticated user's review for a product.
     *
     * Rules:
     * - userId comes from JWT
     * - one review per user per product
     * - rating 1..5 (validated via DTO)
     * - product.rating and product.review_count are recalculated automatically
     */
    @Transactional
    public ProductReviewResponse upsertReview(Long productId, User currentUser, UpsertProductReviewRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        ProductReview review = productReviewRepository
                .findByUserIdAndProductId(currentUser.getId(), productId)
                .orElseGet(() -> ProductReview.builder()
                        .product(product)
                        .user(currentUser)
                        .build());

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        ProductReview saved = productReviewRepository.save(review);

        // Ensure DB constraints/triggers (if present) see the row before recalculating.
        productReviewRepository.flush();

        // Application-level recalculation (works even without trigger).
        recalculateProductRating(productId);

        return mapToResponse(saved);
    }

    /**
     * Recalculate product.review_count and product.rating based on product_reviews.
     *
     * Rating = AVG(rating)
     * review_count = COUNT(*)
     */
    @Transactional
    public void recalculateProductRating(Long productId) {
        Object[] row = (Object[]) entityManager.createQuery(
                        "select count(r), coalesce(sum(r.rating), 0) from ProductReview r where r.product.id = :productId")
                .setParameter("productId", productId)
                .getSingleResult();

        long count = (Long) row[0];
        long sum = (Long) row[1];

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        product.setReviewCount(Math.toIntExact(count));

        if (count == 0) {
            product.setRating(null);
        } else {
            BigDecimal avg = BigDecimal.valueOf(sum)
                    .divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
            product.setRating(avg);
        }

        productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public Page<ProductReviewResponse> listReviews(Long productId, Pageable pageable) {
        // Validate product exists and return 404 otherwise
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }
        return productReviewRepository.findByProductId(productId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public ProductReviewResponse getMyReview(Long productId, User currentUser) {
        // Validate product exists (gives better 404 semantics)
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        ProductReview review = productReviewRepository.findByUserIdAndProductId(currentUser.getId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductReview", "productId", productId));

        return mapToResponse(review);
    }

    @Transactional
    public void deleteMyReview(Long productId, User currentUser) {
        // Validate product exists first
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        long deleted = productReviewRepository.deleteByUserIdAndProductId(currentUser.getId(), productId);
        if (deleted == 0) {
            throw new ResourceNotFoundException("ProductReview", "productId", productId);
        }

        productReviewRepository.flush();
        recalculateProductRating(productId);
    }

    private ProductReviewResponse mapToResponse(ProductReview review) {
        return ProductReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProduct().getId())
                .userId(review.getUser().getId())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
