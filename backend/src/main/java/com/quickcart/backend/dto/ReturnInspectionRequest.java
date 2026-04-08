package com.quickcart.backend.dto;

import com.quickcart.backend.entity.ReturnInspectionStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReturnInspectionRequest {
    @NotNull
    private ReturnInspectionStatus inspectionStatus;
}
