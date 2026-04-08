package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.entity.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PendingUserResponse {
    private Long id;
    private String name;
    private String email;
    private RoleType role;
    private UserStatus status;
    private LocalDateTime createdAt;
    private String createdBy;
}

