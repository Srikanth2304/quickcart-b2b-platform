package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @EntityGraph(attributePaths = {"manufacturer"})
    Page<Product> findByManufacturer(User manufacturer, Pageable pageable);

    @EntityGraph(attributePaths = {"manufacturer"})
    Page<Product> findByStatus(ProductStatus status, Pageable pageable);

    Optional<Product> findByIdAndManufacturer(Long id, User manufacturer);
}

