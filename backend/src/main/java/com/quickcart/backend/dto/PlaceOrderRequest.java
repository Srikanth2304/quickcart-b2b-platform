package com.quickcart.backend.dto;

import com.quickcart.backend.entity.PaymentMethod;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class PlaceOrderRequest {

    @NotEmpty(message = "Order items cannot be empty")
    private List<OrderItemRequest> items;

    @NotNull(message = "deliveryAddressId is required")
    private Long deliveryAddressId;

    /**
     * Payment method for this order.
     * Defaults to ONLINE if not provided (backward compatible).
     */
    private PaymentMethod paymentMethod;
}