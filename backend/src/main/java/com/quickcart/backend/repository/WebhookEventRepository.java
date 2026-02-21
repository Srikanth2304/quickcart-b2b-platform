package com.quickcart.backend.repository;

import com.quickcart.backend.entity.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {

    /**
     * Check if a Razorpay webhook event has already been processed (idempotency guard).
     */
    boolean existsByEventId(String eventId);
}

