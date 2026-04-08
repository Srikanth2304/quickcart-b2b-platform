package com.quickcart.backend.repository;

import com.quickcart.backend.entity.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {

    List<ProductImage> findByProductIdOrderByIsPrimaryDescDisplayOrderAscIdAsc(Long productId);
}
