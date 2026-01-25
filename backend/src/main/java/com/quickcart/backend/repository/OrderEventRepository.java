package com.quickcart.backend.repository;

import com.quickcart.backend.entity.OrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderEventRepository extends JpaRepository<OrderEvent, Long> {
    List<OrderEvent> findByOrderIdOrderByCreatedAtAsc(Long orderId);
}
