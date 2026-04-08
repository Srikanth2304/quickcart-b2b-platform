package com.quickcart.backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class StatusUpdateRequest {
    @NotNull(message = "isActive is required")
    private Boolean isActive;
}

