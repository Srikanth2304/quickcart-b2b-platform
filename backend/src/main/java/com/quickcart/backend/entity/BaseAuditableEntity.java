package com.quickcart.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Base class for entities that need created/updated timestamps.
 *
 * Kept lightweight and framework-agnostic (no Spring Data auditing dependency).
 */
@MappedSuperclass
@Getter
@Setter
public abstract class BaseAuditableEntity {

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Audit: user that created this record.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /**
     * Audit: user that last updated this record.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    /**
     * Helper for subclasses to set audit fields during their own @PrePersist.
     */
    protected void applyAuditOnCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    /**
     * Helper for subclasses to set audit fields during their own @PreUpdate.
     */
    protected void applyAuditOnUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
