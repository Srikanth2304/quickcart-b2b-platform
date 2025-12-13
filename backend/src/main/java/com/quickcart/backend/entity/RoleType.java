package com.quickcart.backend.entity;

/**
 * Enum representing valid role types in the QuickCart B2B application.
 * Provides compile-time safety for role values.
 */
public enum RoleType {
    MANUFACTURER,
    RETAILER;

    /**
     * Returns the role name as stored in the database.
     * @return the role name string
     */
    public String getRoleName() {
        return this.name();
    }
}

