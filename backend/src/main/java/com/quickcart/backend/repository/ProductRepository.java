package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Product;
import com.quickcart.backend.entity.ProductStatus;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // Manufacturer view - eagerly fetch manufacturer to avoid LazyInitializationException
    @EntityGraph(attributePaths = {"manufacturer"})
    List<Product> findByManufacturer(User manufacturer);

    // Retailer view - eagerly fetch manufacturer to avoid LazyInitializationException
    @EntityGraph(attributePaths = {"manufacturer"})
    List<Product> findByStatus(ProductStatus status);
}
