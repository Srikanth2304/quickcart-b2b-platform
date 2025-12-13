package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // Orders placed by a retailer
    List<Order> findByRetailer(User retailer);

    // Orders received by a manufacturer
    List<Order> findByManufacturer(User manufacturer);

    // Secure fetch: order must belong to retailer
    Optional<Order> findByIdAndRetailer(Long id, User retailer);

    // Secure fetch: order must belong to manufacturer
    Optional<Order> findByIdAndManufacturer(Long id, User manufacturer);
}
