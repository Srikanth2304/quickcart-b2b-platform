package com.quickcart.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CancelOrderRequest {

    @Size(max = 500, message = "Cancellation reason must be at most 500 characters")
    private String reason;
}

