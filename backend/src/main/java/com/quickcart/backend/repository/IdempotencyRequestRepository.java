package com.quickcart.backend.repository;

import com.quickcart.backend.entity.IdempotencyRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface IdempotencyRequestRepository extends JpaRepository<IdempotencyRequest, Long> {

    Optional<IdempotencyRequest> findByIdempotencyKeyAndEndpoint(String idempotencyKey, String endpoint);

    /**
     * Cleanup: delete old idempotency records older than given timestamp.
     */
    void deleteByCreatedAtBefore(LocalDateTime cutoff);
}
