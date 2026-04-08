package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests", indexes = {
        @Index(name = "idx_return_requests_order_id", columnList = "order_id"),
        @Index(name = "idx_return_requests_status", columnList = "return_status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(length = 500)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "return_status", nullable = false, length = 50)
    private ReturnStatus returnStatus;

    @Column(name = "requested_at", nullable = false)
    private LocalDateTime requestedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "received_at")
    private LocalDateTime receivedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "inspection_status", length = 50)
    private ReturnInspectionStatus inspectionStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "refund_status", length = 50)
    private ReturnRefundStatus refundStatus;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        applyAuditOnCreate();
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
        if (returnStatus == null) {
            returnStatus = ReturnStatus.REQUESTED;
        }
        if (quantity == null || quantity <= 0) {
            quantity = 1;
        }
        if (refundStatus == null) {
            refundStatus = ReturnRefundStatus.PENDING;
        }
        if (inspectionStatus == null) {
            inspectionStatus = ReturnInspectionStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        applyAuditOnUpdate();
    }
}

