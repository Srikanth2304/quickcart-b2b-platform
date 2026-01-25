package com.quickcart.backend.dto;

import com.quickcart.backend.entity.RefundInitiatedBy;
import com.quickcart.backend.entity.RefundStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefundResponse {
    private Long id;
    private Long orderId;
    private Long paymentId;
    private RefundInitiatedBy initiatedBy;
    private RefundStatus status;
    private String reason;
    private String manufacturerNote;
    private LocalDateTime requestedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime processedAt;
    private String refundReference;
}

