package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.Set;

@Data
public class CreateCatalogManagerRequest {

    @NotBlank(message = "name cannot be blank")
    private String name;

    @NotBlank(message = "email cannot be blank")
    @Email(message = "email must be valid")
    private String email;

    @NotBlank(message = "password cannot be blank")
    private String password;

    @NotNull(message = "roles cannot be null")
    private Set<RoleType> roles;

    private Boolean isActive;
}

