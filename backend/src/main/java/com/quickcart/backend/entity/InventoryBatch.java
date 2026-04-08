package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "inventory_batches",
        indexes = {
                @Index(name = "idx_inventory_batches_product_id", columnList = "product_id"),
                @Index(name = "idx_inventory_batches_variant_id", columnList = "variant_id"),
                @Index(name = "idx_inventory_batches_expiry_date", columnList = "expiry_date")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryBatch extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Column(name = "batch_code", nullable = false, length = 100)
    private String batchCode;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "remaining_quantity", nullable = false)
    private Integer remainingQuantity;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "supplier_name", length = 150)
    private String supplierName;

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
