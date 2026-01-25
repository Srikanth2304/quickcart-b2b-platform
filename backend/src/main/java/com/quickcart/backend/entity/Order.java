package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Retailer who placed the order
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "retailer_id", nullable = false)
    private User retailer;

    // Manufacturer who receives the order
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manufacturer_id", nullable = false)
    private User manufacturer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    // Shipment / tracking (set by manufacturer)
    @Column(name = "shipment_carrier", length = 100)
    private String shipmentCarrier;

    @Column(name = "shipment_tracking_number", length = 100)
    private String shipmentTrackingNumber;

    @Column(name = "shipment_tracking_url", length = 500)
    private String shipmentTrackingUrl;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @OneToMany(
            mappedBy = "order",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    private List<OrderItem> items;

    @PrePersist
    protected void onCreate() {
        applyAuditOnCreate();
        // Keep original business default
        if (this.status == null) {
            this.status = OrderStatus.CREATED;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        applyAuditOnUpdate();
    }
}
