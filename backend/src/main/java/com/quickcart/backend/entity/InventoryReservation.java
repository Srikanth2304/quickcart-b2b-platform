package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "inventory_reservations",
        indexes = {
                @Index(name = "idx_inventory_reservations_product_id", columnList = "product_id"),
                @Index(name = "idx_inventory_reservations_variant_id", columnList = "variant_id"),
                @Index(name = "idx_inventory_reservations_user_id", columnList = "user_id"),
                @Index(name = "idx_inventory_reservations_status_expiry", columnList = "status,expiry_time")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryReservation extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "quantity", nullable = false)
    private Integer reservedQuantity;

    @Column(name = "expiry_time", nullable = false)
    private LocalDateTime reservationExpiryTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InventoryReservationStatus status;
}
