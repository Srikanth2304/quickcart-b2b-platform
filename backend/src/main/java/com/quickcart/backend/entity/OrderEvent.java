package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "order_events",
        indexes = {
                @Index(name = "idx_order_events_order_id", columnList = "order_id"),
                @Index(name = "idx_order_events_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private OrderEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private OrderStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 30)
    private OrderStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actor;

    @Column(length = 1000)
    private String note;

    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}

