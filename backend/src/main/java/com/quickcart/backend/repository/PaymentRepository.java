package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Payment;
import com.quickcart.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByRetailer(User retailer);

    Optional<Payment> findByOrderId(Long orderId);
}
