package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class AdminCreateUserRequest {

    @NotBlank(message = "name cannot be blank")
    private String name;

    @NotBlank(message = "email cannot be blank")
    @Email(message = "email must be valid")
    private String email;

    @NotBlank(message = "password cannot be blank")
    private String password;

    /** Roles to assign (e.g., [MANUFACTURER] or [RETAILER] or [CATALOG_MANAGER]) */
    @NotNull(message = "roles cannot be null")
    private Set<RoleType> roles;

    /** Optional: defaults to true */
    private Boolean isActive;
}

