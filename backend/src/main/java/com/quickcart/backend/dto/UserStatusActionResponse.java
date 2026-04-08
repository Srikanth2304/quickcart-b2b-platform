package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RoleType;
import com.quickcart.backend.entity.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserStatusActionResponse {
    private Long userId;
    private String email;
    private RoleType role;
    private UserStatus status;
    private Boolean isActive;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

