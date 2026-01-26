package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "refunds",
        uniqueConstraints = @UniqueConstraint(columnNames = "order_id"),
        indexes = {
                @Index(name = "idx_refunds_status", columnList = "status"),
                @Index(name = "idx_refunds_payment_id", columnList = "payment_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Refund extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    /**
     * Optional gateway reference for observability / future multi-gateway support.
     */
    @Column(name = "gateway", length = 50)
    private String gateway;

    @Enumerated(EnumType.STRING)
    @Column(name = "initiated_by", nullable = false, length = 20)
    private RefundInitiatedBy initiatedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private RefundStatus status;

    @Column(length = 500)
    private String reason;

    @Column(name = "manufacturer_note", length = 500)
    private String manufacturerNote;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @Column(name = "refund_reference")
    private String refundReference;

    @PrePersist
    protected void onCreate() {
        applyAuditOnCreate();
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        applyAuditOnUpdate();
    }
}
