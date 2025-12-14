package com.quickcart.backend.repository;


import com.quickcart.backend.entity.Invoice;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InvoiceRepository extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByOrderId(Long orderId);

    List<Invoice> findByRetailer(User retailer);
}