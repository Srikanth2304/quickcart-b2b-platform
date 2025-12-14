package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Invoice;
import com.quickcart.backend.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    /**
     * Find paginated invoices for a retailer with eager loading.
     * Eagerly loads: order, retailer relationships.
     */
    @Query("SELECT DISTINCT i FROM Invoice i " +
           "LEFT JOIN FETCH i.order o " +
           "LEFT JOIN FETCH o.retailer " +
           "LEFT JOIN FETCH o.manufacturer " +
           "WHERE i.order.retailer = :retailer")
    Page<Invoice> findByRetailer(@Param("retailer") User retailer, Pageable pageable);

    /**
     * Find invoice by order ID with eager loading.
     */
    @Query("SELECT i FROM Invoice i " +
           "LEFT JOIN FETCH i.order " +
           "WHERE i.order.id = :orderId")
    Optional<Invoice> findByOrderId(@Param("orderId") Long orderId);
}
