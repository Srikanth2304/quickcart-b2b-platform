package com.quickcart.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {

    private Long id;
    private String status;
    private BigDecimal totalAmount;
    private LocalDateTime createdAt;

    // Retailer info
    private String retailerName;
    private String retailerEmail;

    // Manufacturer info
    private String manufacturerName;
    private String manufacturerEmail;

    // Order items
    private List<OrderItemResponse> items;
}

