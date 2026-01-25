package com.quickcart.backend.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundDecisionRequest {

    @Size(max = 500)
    private String note;
}
