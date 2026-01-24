package com.quickcart.backend.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
public class AdminUserResponse {
    private Long id;
    private String name;
    private String email;
    private Boolean isActive;
    private Set<String> roles;

    private Long createdById;
    private String createdByEmail;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

