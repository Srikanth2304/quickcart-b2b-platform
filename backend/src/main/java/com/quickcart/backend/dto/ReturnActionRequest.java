package com.quickcart.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ReturnActionRequest {
    @Size(max = 500)
    private String note;
}
