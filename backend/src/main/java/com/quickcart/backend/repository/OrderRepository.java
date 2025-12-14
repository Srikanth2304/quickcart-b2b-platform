package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // Orders placed by a retailer with all relationships loaded
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.retailer = :retailer")
    List<Order> findByRetailer(@Param("retailer") User retailer);

    // Orders received by a manufacturer with all relationships loaded
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.manufacturer = :manufacturer")
    List<Order> findByManufacturer(@Param("manufacturer") User manufacturer);

    // Secure fetch: order must belong to retailer
    Optional<Order> findByIdAndRetailer(Long id, User retailer);

    // Secure fetch: order must belong to manufacturer
    Optional<Order> findByIdAndManufacturer(Long id, User manufacturer);

    // Find order by ID with all relationships loaded
    @Query("SELECT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.id = :id")
    Optional<Order> findByIdWithRelations(@Param("id") Long id);
}
