package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "invoices",
        uniqueConstraints = @UniqueConstraint(columnNames = "order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false, unique = true)
    private String invoiceNumber;

    @OneToOne
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne
    @JoinColumn(name = "retailer_id", nullable = false)
    private User retailer;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvoiceStatus status;

    @PrePersist
    protected void onCreate() {
        applyAuditOnCreate();

        if (this.status == null) {
            this.status = InvoiceStatus.GENERATED;
        }
        if (this.invoiceNumber == null) {
            this.invoiceNumber = "INV-" + UUID.randomUUID();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        applyAuditOnUpdate();
    }
}