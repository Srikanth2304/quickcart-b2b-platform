package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "payments",
        uniqueConstraints = @UniqueConstraint(columnNames = "order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Payment extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Order being paid
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Retailer who made the payment
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retailer_id", nullable = false)
    private User retailer;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentGateway gateway;

    /**
     * Razorpay order id created server-side (used by frontend checkout).
     */
    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    /**
     * Razorpay payment id received after successful checkout (verified server-side).
     */
    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Column(name = "payment_reference")
    private String paymentReference;

    @PrePersist
    protected void onCreate() {
        applyAuditOnCreate();
        if (this.status == null) {
            this.status = PaymentStatus.INITIATED;
        }
        if (this.gateway == null) {
            this.gateway = PaymentGateway.RAZORPAY;
        }
        if (this.paymentReference == null) {
            this.paymentReference = UUID.randomUUID().toString();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        applyAuditOnUpdate();
    }
}