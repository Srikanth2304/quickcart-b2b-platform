package com.quickcart.backend.service;

import com.quickcart.backend.dto.OrderItemResponse;
import com.quickcart.backend.dto.OrderResponse;
import com.quickcart.backend.entity.Order;
import com.quickcart.backend.entity.OrderItem;
import com.quickcart.backend.entity.User;
import com.quickcart.backend.exception.AccessDeniedException;
import com.quickcart.backend.exception.ResourceNotFoundException;
import com.quickcart.backend.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for querying orders.
 * Separated from OrderService to maintain single responsibility.
 */
@Service
@RequiredArgsConstructor
public class OrderQueryService {

    private final OrderRepository orderRepository;

    /**
     * Get all orders for the authenticated user.
     * Manufacturers see orders they received.
     * Retailers see orders they placed.
     */
    public List<OrderResponse> getOrders(User user) {
        List<Order> orders;

        boolean isManufacturer = user.hasRole("MANUFACTURER");

        if (isManufacturer) {
            orders = orderRepository.findByManufacturer(user);
        } else {
            orders = orderRepository.findByRetailer(user);
        }

        return orders.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get a specific order by ID.
     * Validates that the user is either the manufacturer or retailer of the order.
     */
    public OrderResponse getOrderById(Long orderId, User user) {
        Order order = orderRepository.findByIdWithRelations(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));

        // Check if user is authorized to view this order
        boolean isManufacturer = order.getManufacturer().getId().equals(user.getId());
        boolean isRetailer = order.getRetailer().getId().equals(user.getId());

        if (!isManufacturer && !isRetailer) {
            throw new AccessDeniedException("Order", orderId);
        }

        return mapToResponse(order);
    }

    /**
     * Maps Order entity to OrderResponse DTO.
     */
    private OrderResponse mapToResponse(Order order) {
        return OrderResponse.builder()
                .id(order.getId())
                .status(order.getStatus().name())
                .totalAmount(order.getTotalAmount())
                .createdAt(order.getCreatedAt())
                .retailerName(order.getRetailer().getName())
                .retailerEmail(order.getRetailer().getEmail())
                .manufacturerName(order.getManufacturer().getName())
                .manufacturerEmail(order.getManufacturer().getEmail())
                .items(order.getItems().stream()
                        .map(this::mapItemToResponse)
                        .collect(Collectors.toList()))
                .build();
    }

    /**
     * Maps OrderItem entity to OrderItemResponse DTO.
     */
    private OrderItemResponse mapItemToResponse(OrderItem item) {
        BigDecimal subtotal = item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));

        return OrderItemResponse.builder()
                .productId(item.getProduct().getId())
                .productName(item.getProduct().getName())
                .quantity(item.getQuantity())
                .price(item.getPrice())
                .subtotal(subtotal)
                .build();
    }
}
