package com.quickcart.backend.dto;

import com.quickcart.backend.entity.OrderEventType;
import com.quickcart.backend.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderEventResponse {
    private Long id;
    private Long orderId;
    private OrderEventType eventType;
    private OrderStatus fromStatus;
    private OrderStatus toStatus;
    private Long actorUserId;
    private String actorName;
    private String note;
    private LocalDateTime createdAt;
}

