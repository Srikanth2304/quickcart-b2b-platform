package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * Find paginated orders for a retailer with eager loading.
     * Uses DISTINCT to avoid duplicate rows from JOIN.
     * Eagerly loads: retailer, manufacturer, items, product.
     */
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.retailer = :retailer")
    Page<Order> findByRetailer(@Param("retailer") User retailer, Pageable pageable);

    /**
     * Find paginated orders for a manufacturer with eager loading.
     * Uses DISTINCT to avoid duplicate rows from JOIN.
     * Eagerly loads: retailer, manufacturer, items, product.
     */
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.manufacturer = :manufacturer")
    Page<Order> findByManufacturer(@Param("manufacturer") User manufacturer, Pageable pageable);

    /**
     * Secure fetch: order must belong to retailer with eager loading.
     */
    @Query("SELECT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.id = :id AND o.retailer = :retailer")
    Optional<Order> findByIdAndRetailer(@Param("id") Long id, @Param("retailer") User retailer);

    /**
     * Secure fetch: order must belong to manufacturer with eager loading.
     */
    @Query("SELECT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.id = :id AND o.manufacturer = :manufacturer")
    Optional<Order> findByIdAndManufacturer(@Param("id") Long id, @Param("manufacturer") User manufacturer);

    /**
     * Find order by ID with eager loading of all relationships.
     */
    @Query("SELECT o FROM Order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.id = :id")
    Optional<Order> findByIdWithRelations(@Param("id") Long id);
}
