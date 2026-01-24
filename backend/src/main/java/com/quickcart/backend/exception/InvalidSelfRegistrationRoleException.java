package com.quickcart.backend.exception;

import com.quickcart.backend.entity.RoleType;

/**
 * Thrown when a user attempts to self-register with a role that must be created by an admin.
 */
public class InvalidSelfRegistrationRoleException extends ApplicationException {

    public InvalidSelfRegistrationRoleException(RoleType role) {
        super("Self-registration is not allowed for role: " + role);
    }
}

