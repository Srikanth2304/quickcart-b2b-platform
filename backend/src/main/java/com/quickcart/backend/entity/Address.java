package com.quickcart.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "addresses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Address extends BaseAuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "name", length = 100)
    private String name;

    @Column(name = "phone", length = 15)
    private String phone;

    @Column(name = "alternate_phone", length = 15)
    private String alternatePhone;

    @Enumerated(EnumType.STRING)
    @Column(name = "address_type", length = 20)
    private AddressType addressType;

    @Column(name = "locality", length = 150)
    private String locality;

    @Column(name = "landmark", length = 150)
    private String landmark;

    @Column(name = "address_line1", length = 255)
    private String addressLine1;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state", length = 100)
    private String state;

    @Column(name = "pincode", length = 10)
    private String pincode;

    @Column(name = "is_default")
    private Boolean isDefault = false;

    // Soft delete
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        applyAuditOnCreate();
        if (isDefault == null) {
            isDefault = false;
        }
        if (isActive == null) {
            isActive = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        applyAuditOnUpdate();
        if (isDefault == null) {
            isDefault = false;
        }
        if (isActive == null) {
            isActive = true;
        }
    }
}
