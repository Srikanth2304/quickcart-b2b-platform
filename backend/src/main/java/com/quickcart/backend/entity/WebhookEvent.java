package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Stores processed Razorpay webhook event IDs for idempotency.
 * If an event ID already exists in this table, the webhook is skipped (duplicate delivery).
 */
@Entity
@Table(name = "webhook_events",
        indexes = @Index(name = "idx_webhook_events_event_id", columnList = "event_id", unique = true))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Razorpay event id (e.g. "event_ABC123..."). Unique index ensures idempotency.
     */
    @Column(name = "event_id", nullable = false, unique = true, length = 100)
    private String eventId;

    /**
     * Event type string (e.g. "payment.captured", "refund.processed").
     */
    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    /**
     * Processing outcome: SUCCESS or SKIPPED or ERROR.
     */
    @Column(name = "status", nullable = false, length = 30)
    private String status;

    /**
     * Optional note (e.g. error message on failure, or "duplicate" on skip).
     */
    @Column(name = "note", length = 500)
    private String note;

    @Column(name = "received_at", nullable = false, updatable = false)
    private LocalDateTime receivedAt;

    @PrePersist
    protected void onCreate() {
        if (receivedAt == null) {
            receivedAt = LocalDateTime.now();
        }
    }
}

