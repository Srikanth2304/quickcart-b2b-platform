package com.quickcart.backend.repository;

import com.quickcart.backend.entity.Refund;
import com.quickcart.backend.entity.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    Optional<Refund> findByOrderId(Long orderId);

    List<Refund> findByStatus(RefundStatus status);

    // Auto-complete refunds that have been processing for a long time.
    List<Refund> findByStatusAndApprovedAtBefore(RefundStatus status, java.time.LocalDateTime cutoff);
}
