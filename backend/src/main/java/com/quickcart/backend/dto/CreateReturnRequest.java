package com.quickcart.backend.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateReturnRequest {
    @NotNull
    private Long orderId;

    @NotNull
    private Long orderItemId;

    @Min(1)
    private Integer quantity;

    @Size(max = 500)
    private String reason;
}
