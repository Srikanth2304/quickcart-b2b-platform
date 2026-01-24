package com.quickcart.backend.repository;

import com.quickcart.backend.entity.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    Optional<ProductReview> findByUserIdAndProductId(Long userId, Long productId);

    Page<ProductReview> findByProductId(Long productId, Pageable pageable);

    long deleteByUserIdAndProductId(Long userId, Long productId);

    @Query("select count(r) from ProductReview r where r.product.id = :productId")
    long countByProductId(@Param("productId") Long productId);

    @Query("select avg(r.rating) from ProductReview r where r.product.id = :productId")
    Double averageRatingByProductId(@Param("productId") Long productId);
}
