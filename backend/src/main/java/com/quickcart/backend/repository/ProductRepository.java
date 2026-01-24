package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.domain.Specification;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    @EntityGraph(attributePaths = {"manufacturer", "category"})
    Page<Product> findByManufacturer(User manufacturer, Pageable pageable);

    @EntityGraph(attributePaths = {"manufacturer", "category"})
    Page<Product> findByStatus(ProductStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"manufacturer", "category"})
    Optional<Product> findByIdAndManufacturer(Long id, User manufacturer);

    @Override
    @EntityGraph(attributePaths = {"manufacturer", "category"})
    Optional<Product> findById(Long id);

    // IMPORTANT: JpaSpecificationExecutor's findAll(spec, pageable) does NOT inherit the above graphs.
    // We override it here to eager-fetch relationships used in DTO mapping.
    @Override
    @EntityGraph(attributePaths = {"manufacturer", "category"})
    Page<Product> findAll(Specification<Product> spec, Pageable pageable);
}
