package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RoleType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class OAuthLoginRequest {
    @NotBlank(message = "OAuth token is required")
    private String oauthToken;

    private String email;
    private String name;
    private String socialId;
    private RoleType role;
}

